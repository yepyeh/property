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
  owner_user_id: number | null;
  plan_type: string;
  trial_ends_at: string | null;
  paid_until: string | null;
  promoted_until: string | null;
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
  ownerUserId?: number | null;
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

export interface ListingPlanUpdateInput {
  listingSlug: string;
  planType: "free_trial" | "paid" | "promoted";
  paidDays?: number;
  promotedDays?: number;
}

export interface PaymentRecordInput {
  stripeSessionId: string;
  stripePaymentIntentId?: string | null;
  listingSlug: string;
  ownerUserId?: number | null;
  ownerEmail?: string | null;
  planType: "paid" | "promoted";
  amount: number;
  currency: string;
  status: string;
  paidAt?: string | null;
}

export function getDB(runtime?: RuntimeLike | null) {
  return runtime?.env?.DB;
}

export async function normalizeExpiredListingPlans(db?: D1Like) {
  if (!db) return;

  await db
    .prepare(
      `UPDATE listings
       SET promoted_until = NULL,
           plan_type = CASE
             WHEN paid_until IS NOT NULL AND paid_until >= CURRENT_TIMESTAMP THEN 'paid'
             WHEN trial_ends_at IS NOT NULL AND trial_ends_at >= CURRENT_TIMESTAMP THEN 'free_trial'
             ELSE 'free_trial'
           END
       WHERE promoted_until IS NOT NULL
         AND promoted_until < CURRENT_TIMESTAMP`
    )
    .bind()
    .run();

  await db
    .prepare(
      `UPDATE listings
       SET plan_type = 'free_trial',
           paid_until = NULL
       WHERE paid_until IS NOT NULL
         AND paid_until < CURRENT_TIMESTAMP`
    )
    .bind()
    .run();

  await db
    .prepare(
      `UPDATE listings
       SET published = 0,
           status = 'Expired listing'
       WHERE plan_type = 'free_trial'
         AND trial_ends_at IS NOT NULL
         AND trial_ends_at < CURRENT_TIMESTAMP
         AND (paid_until IS NULL OR paid_until < CURRENT_TIMESTAMP)`
    )
    .bind()
    .run();
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
    commerce: {
      planType: row.plan_type as NonNullable<Listing["commerce"]>["planType"],
      trialEndsAt: row.trial_ends_at,
      paidUntil: row.paid_until,
      promotedUntil: row.promoted_until,
    },
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
  await normalizeExpiredListingPlans(db);

  const { results } = await db
    .prepare(
      `SELECT * FROM listings
       WHERE published = 1
         AND (plan_type = 'paid' OR paid_until IS NOT NULL OR trial_ends_at IS NULL OR trial_ends_at >= CURRENT_TIMESTAMP)
       ORDER BY (CASE WHEN promoted_until IS NOT NULL AND promoted_until >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END),
                created_at DESC`
    )
    .bind()
    .all<ListingRow>();

  return results.map(mapRowToListing);
}

async function getFilteredDynamicListings(filters: ListingFilters, db?: D1Like) {
  if (!db) return [] as Listing[];
  await normalizeExpiredListingPlans(db);

  const clauses = [
    "published = 1",
    "(plan_type = 'paid' OR paid_until IS NOT NULL OR trial_ends_at IS NULL OR trial_ends_at >= CURRENT_TIMESTAMP)",
  ];
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
    newest: "(CASE WHEN promoted_until IS NOT NULL AND promoted_until >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END), created_at DESC",
    "price-asc": "(CASE WHEN promoted_until IS NOT NULL AND promoted_until >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END), numeric_price ASC, created_at DESC",
    "price-desc": "(CASE WHEN promoted_until IS NOT NULL AND promoted_until >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END), numeric_price DESC, created_at DESC",
    "beds-desc": "(CASE WHEN promoted_until IS NOT NULL AND promoted_until >= CURRENT_TIMESTAMP THEN 0 ELSE 1 END), beds DESC, created_at DESC",
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
    await normalizeExpiredListingPlans(db);
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
        tags, features, image_keys, owner_user_id, plan_type, trial_ends_at,
        owner_name, owner_email, owner_phone, owner_role, owner_response_time, owner_verified,
        views_24h, saves, enquiries, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 days'), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
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
      JSON.stringify(["Photos pending", "Direct owner contact", "Dashboard managed", "7-day free trial"]),
      JSON.stringify([]),
      input.ownerUserId ?? null,
      "free_trial",
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

export async function getDashboardData(ownerUserId: number, db?: D1Like) {
  if (!db) {
    return { listings: [], enquiries: [], payments: [] };
  }
  await normalizeExpiredListingPlans(db);

  const listingsResult = await db
    .prepare(
      `SELECT slug, title, city, district, intent, status, created_at, enquiries,
              image_keys, plan_type, trial_ends_at, paid_until, promoted_until
       FROM listings
       WHERE owner_user_id = ?
       ORDER BY created_at DESC`
    )
    .bind(ownerUserId)
    .all();

  const enquiriesResult = await db
    .prepare(
      `SELECT e.listing_slug, e.listing_title, e.applicant_name, e.contact, e.preferred_time, e.created_at
       FROM enquiries e
       JOIN listings l ON l.slug = e.listing_slug
       WHERE l.owner_user_id = ?
       ORDER BY e.created_at DESC`
    )
    .bind(ownerUserId)
    .all();

  const paymentsResult = await db
    .prepare(
      `SELECT stripe_session_id, stripe_payment_intent_id, listing_slug, owner_email,
              plan_type, amount, currency, status, created_at, paid_at
       FROM payments
       WHERE owner_user_id = ?
       ORDER BY created_at DESC`
    )
    .bind(ownerUserId)
    .all();

  return {
    listings: listingsResult.results,
    enquiries: enquiriesResult.results,
    payments: paymentsResult.results,
  };
}

export async function getAdminBillingData(db?: D1Like) {
  if (!db) return { listings: [], payments: [] };
  await normalizeExpiredListingPlans(db);

  const listingsResult = await db
    .prepare(
      `SELECT slug, title, city, district, intent, status, created_at, enquiries,
              plan_type, trial_ends_at, paid_until, promoted_until,
              owner_name, owner_email, owner_user_id
       FROM listings
       ORDER BY created_at DESC`
    )
    .bind()
    .all();

  const paymentsResult = await db
    .prepare(
      `SELECT stripe_session_id, stripe_payment_intent_id, listing_slug, owner_email,
              plan_type, amount, currency, status, created_at, paid_at
       FROM payments
       ORDER BY created_at DESC`
    )
    .bind()
    .all();

  return {
    listings: listingsResult.results,
    payments: paymentsResult.results,
  };
}

export async function updateListingPlan(
  db: D1Like,
  ownerUserId: number | null,
  isAdmin: boolean,
  input: ListingPlanUpdateInput
) {
  await normalizeExpiredListingPlans(db);

  const listing = await db
    .prepare(
      `SELECT slug, owner_user_id, paid_until, promoted_until
       FROM listings
       WHERE slug = ?
       LIMIT 1`
    )
    .bind(input.listingSlug)
    .first<{ slug: string; owner_user_id: number | null; paid_until: string | null; promoted_until: string | null }>();

  if (!listing) return { ok: false as const, error: "not_found" };
  if (!isAdmin && listing.owner_user_id !== ownerUserId) return { ok: false as const, error: "forbidden" };

  const paidDays = input.paidDays && input.paidDays > 0 ? input.paidDays : 30;
  const promotedDays = input.promotedDays && input.promotedDays > 0 ? input.promotedDays : 7;

  if (input.planType === "free_trial") {
    await db
      .prepare(
        `UPDATE listings
         SET plan_type = 'free_trial',
             trial_ends_at = datetime('now', '+7 days'),
             paid_until = NULL,
             promoted_until = NULL
         WHERE slug = ?`
      )
      .bind(input.listingSlug)
      .run();

    return { ok: true as const };
  }

  if (input.planType === "paid") {
    await db
      .prepare(
        `UPDATE listings
         SET plan_type = 'paid',
             paid_until = datetime('now', ?),
             promoted_until = NULL
         WHERE slug = ?`
      )
      .bind(`+${paidDays} days`, input.listingSlug)
      .run();

    return { ok: true as const };
  }

  await db
    .prepare(
      `UPDATE listings
       SET plan_type = 'promoted',
           paid_until = COALESCE(paid_until, datetime('now', '+30 days')),
           promoted_until = datetime('now', ?)
       WHERE slug = ?`
    )
    .bind(`+${promotedDays} days`, input.listingSlug)
    .run();

  return { ok: true as const };
}

export async function recordPayment(db: D1Like, input: PaymentRecordInput) {
  await db
    .prepare(
      `INSERT INTO payments (
        stripe_session_id, stripe_payment_intent_id, listing_slug, owner_user_id, owner_email,
        plan_type, amount, currency, status, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(stripe_session_id) DO UPDATE SET
        stripe_payment_intent_id = excluded.stripe_payment_intent_id,
        status = excluded.status,
        paid_at = excluded.paid_at`
    )
    .bind(
      input.stripeSessionId,
      input.stripePaymentIntentId ?? null,
      input.listingSlug,
      input.ownerUserId ?? null,
      input.ownerEmail ?? null,
      input.planType,
      input.amount,
      input.currency,
      input.status,
      input.paidAt ?? null
    )
    .run();
}
