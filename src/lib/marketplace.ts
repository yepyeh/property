import { getListingBySlug as getSeededListingBySlug, listings as seededListings, type Listing } from "../data/listings";

interface D1Like {
  prepare(query: string): {
    bind: (...values: unknown[]) => {
      all: <T = unknown>() => Promise<{ results: T[] }>;
      first: <T = unknown>() => Promise<T | null>;
      run: () => Promise<unknown>;
    };
  };
}

interface RuntimeLike {
  env?: {
    DB?: D1Like;
  };
}

interface ListingRow {
  id: number;
  slug: string;
  title: string;
  city: string;
  district: string;
  ward: string;
  property_type: string;
  intent: string;
  price_label: string;
  numeric_price: number;
  price_unit: string;
  beds: number;
  baths: number;
  area: number;
  status: string;
  tone: string;
  summary: string;
  description: string;
  tags: string;
  features: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  owner_role: string;
  owner_response_time: string;
  owner_verified: number;
  views_24h: number;
  saves: number;
  enquiries: number;
  image_keys: string;
  created_at: string;
}

export interface ListingInput {
  title: string;
  city: string;
  district: string;
  ward: string;
  propertyType: string;
  intent: string;
  priceLabel: string;
  numericPrice: number;
  priceUnit: string;
  beds: number;
  baths: number;
  area: number;
  summary: string;
  description: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}

export interface EnquiryInput {
  listingSlug: string;
  listingTitle: string;
  applicantName: string;
  contact: string;
  message: string;
  preferredTime: string;
}

export interface ListingFilters {
  intent?: string;
  city?: string;
  district?: string;
  propertyType?: string;
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  sort?: string;
}

export function getDB(runtime?: RuntimeLike | null) {
  return runtime?.env?.DB;
}

function normalizeTextFilter(value?: string) {
  return value?.trim().toLowerCase() || "";
}

function normalizeSort(value?: string) {
  return value === "price-asc" || value === "price-desc" || value === "beds-desc" ? value : "newest";
}

function mapRowToListing(row: ListingRow): Listing {
  const imageKeys = row.image_keys ? JSON.parse(row.image_keys) : [];

  return {
    slug: row.slug,
    title: row.title,
    city: row.city,
    district: row.district,
    ward: row.ward,
    type: row.property_type as Listing["type"],
    intent: row.intent as Listing["intent"],
    priceLabel: row.price_label,
    numericPrice: row.numeric_price,
    priceUnit: row.price_unit as Listing["priceUnit"],
    beds: row.beds,
    baths: row.baths,
    area: row.area,
    status: row.status,
    tone: row.tone as Listing["tone"],
    summary: row.summary,
    description: row.description,
    tags: row.tags ? JSON.parse(row.tags) : [],
    features: row.features ? JSON.parse(row.features) : [],
    owner: {
      name: row.owner_name,
      role: row.owner_role,
      responseTime: row.owner_response_time,
      verified: Boolean(row.owner_verified),
    },
    stats: {
      views24h: row.views_24h,
      saves: row.saves,
      enquiries: row.enquiries,
    },
    imageKeys,
    imageUrls: imageKeys.map((key: string) => `/media/${key}`),
  };
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function getDynamicListings(db?: D1Like) {
  if (!db) return [] as Listing[];

  const { results } = await db
    .prepare(
      `SELECT * FROM listings
       WHERE published = 1
       ORDER BY created_at DESC`
    )
    .bind()
    .all<ListingRow>();

  return results.map(mapRowToListing);
}

async function getFilteredDynamicListings(filters: ListingFilters, db?: D1Like) {
  if (!db) return [] as Listing[];

  const clauses = ["published = 1"];
  const values: unknown[] = [];

  if (filters.intent === "buy" || filters.intent === "rent") {
    clauses.push("intent = ?");
    values.push(filters.intent);
  }

  if (filters.city) {
    clauses.push("LOWER(city) LIKE ?");
    values.push(`%${normalizeTextFilter(filters.city)}%`);
  }

  if (filters.district) {
    clauses.push("LOWER(district) LIKE ?");
    values.push(`%${normalizeTextFilter(filters.district)}%`);
  }

  if (filters.propertyType) {
    clauses.push("property_type = ?");
    values.push(filters.propertyType);
  }

  if (typeof filters.minPrice === "number" && Number.isFinite(filters.minPrice)) {
    clauses.push("numeric_price >= ?");
    values.push(filters.minPrice);
  }

  if (typeof filters.maxPrice === "number" && Number.isFinite(filters.maxPrice)) {
    clauses.push("numeric_price <= ?");
    values.push(filters.maxPrice);
  }

  if (typeof filters.minBeds === "number" && Number.isFinite(filters.minBeds)) {
    clauses.push("beds >= ?");
    values.push(filters.minBeds);
  }

  const sort = normalizeSort(filters.sort);
  const orderBy = {
    newest: "created_at DESC",
    "price-asc": "numeric_price ASC, created_at DESC",
    "price-desc": "numeric_price DESC, created_at DESC",
    "beds-desc": "beds DESC, created_at DESC",
  }[sort];

  const { results } = await db
    .prepare(
      `SELECT * FROM listings
       WHERE ${clauses.join(" AND ")}
       ORDER BY ${orderBy}`
    )
    .bind(...values)
    .all<ListingRow>();

  return results.map(mapRowToListing);
}

function applyListingFilters(listings: Listing[], filters: ListingFilters) {
  const city = normalizeTextFilter(filters.city);
  const district = normalizeTextFilter(filters.district);
  const sort = normalizeSort(filters.sort);

  const filtered = listings.filter((listing) => {
    if ((filters.intent === "buy" || filters.intent === "rent") && listing.intent !== filters.intent) return false;
    if (city && !listing.city.toLowerCase().includes(city)) return false;
    if (district && !listing.district.toLowerCase().includes(district)) return false;
    if (filters.propertyType && listing.type !== filters.propertyType) return false;
    if (typeof filters.minPrice === "number" && Number.isFinite(filters.minPrice) && listing.numericPrice < filters.minPrice) return false;
    if (typeof filters.maxPrice === "number" && Number.isFinite(filters.maxPrice) && listing.numericPrice > filters.maxPrice) return false;
    if (typeof filters.minBeds === "number" && Number.isFinite(filters.minBeds) && listing.beds < filters.minBeds) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sort === "price-asc") return a.numericPrice - b.numericPrice;
    if (sort === "price-desc") return b.numericPrice - a.numericPrice;
    if (sort === "beds-desc") return b.beds - a.beds || b.numericPrice - a.numericPrice;
    return 0;
  });

  return filtered;
}

export async function getAllListings(db?: D1Like) {
  const dynamicListings = await getDynamicListings(db);
  const merged = [...dynamicListings, ...seededListings];
  const bySlug = new Map<string, Listing>();

  for (const listing of merged) {
    if (!bySlug.has(listing.slug)) bySlug.set(listing.slug, listing);
  }

  return Array.from(bySlug.values());
}

export async function searchListings(filters: ListingFilters, db?: D1Like) {
  const dynamicListings = await getFilteredDynamicListings(filters, db);
  const filteredSeededListings = applyListingFilters(seededListings, filters);
  const merged = [...dynamicListings, ...filteredSeededListings];
  const bySlug = new Map<string, Listing>();

  for (const listing of merged) {
    if (!bySlug.has(listing.slug)) bySlug.set(listing.slug, listing);
  }

  const result = Array.from(bySlug.values());

  if (normalizeSort(filters.sort) === "newest") {
    return result;
  }

  return applyListingFilters(result, filters);
}

export async function getListingBySlug(slug: string, db?: D1Like) {
  if (db) {
    const row = await db
      .prepare(`SELECT * FROM listings WHERE slug = ? LIMIT 1`)
      .bind(slug)
      .first<ListingRow>();

    if (row) return mapRowToListing(row);
  }

  return getSeededListingBySlug(slug);
}

export async function createListing(db: D1Like, input: ListingInput) {
  const baseSlug = slugify(`${input.title}-${input.city}-${input.district}`);
  const slug = baseSlug || `listing-${Date.now()}`;

  await db
    .prepare(
      `INSERT INTO listings (
        slug, title, city, district, ward, property_type, intent,
        price_label, numeric_price, price_unit, beds, baths, area,
        status, tone, summary, description,
        tags, features, image_keys,
        owner_name, owner_email, owner_phone, owner_role, owner_response_time, owner_verified,
        views_24h, saves, enquiries, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .bind(
      slug,
      input.title,
      input.city,
      input.district,
      input.ward,
      input.propertyType,
      input.intent,
      input.priceLabel,
      input.numericPrice,
      input.priceUnit,
      input.beds,
      input.baths,
      input.area,
      "Owner submitted",
      "sea",
      input.summary,
      input.description,
      JSON.stringify(["Owner submitted", input.intent === "rent" ? "Rent" : "For sale"]),
      JSON.stringify(["Photos pending", "Direct owner contact", "Dashboard managed"]),
      JSON.stringify([]),
      input.ownerName,
      input.ownerEmail,
      input.ownerPhone,
      "Owner",
      "~30 minutes",
      0,
      0,
      0,
      0
    )
    .run();

  return slug;
}

export async function createEnquiry(db: D1Like, input: EnquiryInput) {
  await db
    .prepare(
      `INSERT INTO enquiries (
        listing_slug, listing_title, applicant_name, contact, message, preferred_time
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(input.listingSlug, input.listingTitle, input.applicantName, input.contact, input.message, input.preferredTime)
    .run();

  await db
    .prepare(`UPDATE listings SET enquiries = enquiries + 1 WHERE slug = ?`)
    .bind(input.listingSlug)
    .run();
}

export async function getDashboardData(db?: D1Like) {
  if (!db) {
    return { listings: [], enquiries: [] };
  }

  const listingsResult = await db
    .prepare(
      `SELECT slug, title, city, district, intent, status, created_at, enquiries
             , image_keys
       FROM listings
       ORDER BY created_at DESC`
    )
    .bind()
    .all();

  const enquiriesResult = await db
    .prepare(
      `SELECT listing_slug, listing_title, applicant_name, contact, preferred_time, created_at
       FROM enquiries
       ORDER BY created_at DESC`
    )
    .bind()
    .all();

  return {
    listings: listingsResult.results,
    enquiries: enquiriesResult.results,
  };
}
