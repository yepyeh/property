import {
  buildListingLocationContext,
  buildListingNeighborhoodContext,
  getListingBySlug as getSeededListingBySlug,
  listings as seededListings,
  type Listing,
} from "../data/listings";
import { buildInitialListingPresentation } from "./listing-defaults";
import { normalizeExpiredListingPlans } from "./listing-lifecycle";
import type {
  EnquiryInput,
  ListingFilters,
  ListingInput,
  ListingRow,
  SavedListingRecord,
  SavedSearchInput,
  SavedSearchRecord,
} from "./marketplace-types";
import type { D1Like } from "./runtime";
import { buildInboxEventKey, upsertInboxNotification } from "./notifications";

function normalizeTextFilter(value?: string) {
  return value?.trim().toLowerCase() || "";
}

function normalizeSort(value?: string) {
  return value === "price-asc" || value === "price-desc" || value === "beds-desc" ? value : "newest";
}

function normalizeListingFilters(filters: ListingFilters) {
  return {
    intent: filters.intent === "rent" ? "rent" : "buy",
    city: filters.city?.trim() || "",
    district: filters.district?.trim() || "",
    propertyType: filters.propertyType?.trim() || "",
    minPrice: typeof filters.minPrice === "number" && Number.isFinite(filters.minPrice) ? filters.minPrice : undefined,
    maxPrice: typeof filters.maxPrice === "number" && Number.isFinite(filters.maxPrice) ? filters.maxPrice : undefined,
    minBeds: typeof filters.minBeds === "number" && Number.isFinite(filters.minBeds) ? filters.minBeds : undefined,
    sort: normalizeSort(filters.sort),
  } satisfies ListingFilters;
}

export function buildSavedSearchQuery(filters: ListingFilters) {
  const normalized = normalizeListingFilters(filters);
  const params = new URLSearchParams();

  params.set("intent", normalized.intent || "buy");
  if (normalized.city) params.set("city", normalized.city);
  if (normalized.district) params.set("district", normalized.district);
  if (normalized.propertyType) params.set("propertyType", normalized.propertyType);
  if (typeof normalized.minPrice === "number") params.set("minPrice", String(normalized.minPrice));
  if (typeof normalized.maxPrice === "number") params.set("maxPrice", String(normalized.maxPrice));
  if (typeof normalized.minBeds === "number") params.set("minBeds", String(normalized.minBeds));
  if (normalized.sort && normalized.sort !== "newest") params.set("sort", normalized.sort);

  return params.toString();
}

function buildSavedSearchName(filters: ListingFilters) {
  const normalized = normalizeListingFilters(filters);
  const parts = [
    normalized.intent === "rent" ? "Rent" : "Buy",
    normalized.propertyType || "Any type",
    normalized.city || "All cities",
  ];

  if (normalized.district) parts.push(normalized.district);
  if (typeof normalized.minBeds === "number") parts.push(`${normalized.minBeds}+ beds`);

  return parts.join(" · ");
}

function parseSavedSearchFilters(value: string): ListingFilters {
  try {
    const parsed = JSON.parse(value) as ListingFilters;
    return normalizeListingFilters(parsed);
  } catch {
    return normalizeListingFilters({});
  }
}

function mapRowToListing(row: ListingRow): Listing {
  const imageKeys = row.image_keys ? JSON.parse(row.image_keys) : [];

  const listing: Listing = {
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
    location:
      typeof row.lat === "number" && typeof row.lng === "number"
        ? {
            lat: row.lat,
            lng: row.lng,
            precisionLabel: row.location_precision_label || "Approximate neighborhood view",
          }
        : undefined,
    neighborhood:
      row.neighborhood_headline || row.commute_notes || row.nearby_places !== "[]" || row.trust_signals !== "[]"
        ? {
            headline: row.neighborhood_headline || "",
            commute: row.commute_notes || "",
            nearby: row.nearby_places ? JSON.parse(row.nearby_places) : [],
            trustSignals: row.trust_signals ? JSON.parse(row.trust_signals) : [],
          }
        : undefined,
    imageKeys,
    imageUrls: imageKeys.map((key: string) => `/media/${key}`),
    commerce: {
      planType: row.plan_type as NonNullable<Listing["commerce"]>["planType"],
      trialEndsAt: row.trial_ends_at,
      paidUntil: row.paid_until,
      promotedUntil: row.promoted_until,
    },
  };

  return {
    ...listing,
    location: buildListingLocationContext(listing),
    neighborhood: buildListingNeighborhoodContext(listing),
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

async function ensureUniqueListingSlug(db: D1Like, baseSlug: string) {
  let candidate = baseSlug || `listing-${Date.now()}`;
  let suffix = 1;

  while (await db.prepare(`SELECT id FROM listings WHERE slug = ? LIMIT 1`).bind(candidate).first<{ id: number }>()) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
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
  const slug = await ensureUniqueListingSlug(db, baseSlug || `listing-${Date.now()}`);
  const presentation = buildInitialListingPresentation(input.intent);

  await db
    .prepare(
      `INSERT INTO listings (
        slug, title, city, district, ward, property_type, intent,
        price_label, numeric_price, price_unit, beds, baths, area,
        status, tone, summary, description,
        tags, features, image_keys,
        neighborhood_headline, commute_notes, nearby_places, trust_signals,
        lat, lng, location_precision_label,
        owner_user_id, plan_type, trial_ends_at,
        owner_name, owner_email, owner_phone, owner_role, owner_response_time, owner_verified,
        views_24h, saves, enquiries, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 days'), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
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
      presentation.status,
      presentation.tone,
      input.summary,
      input.description,
      JSON.stringify(presentation.tags),
      JSON.stringify(presentation.features),
      JSON.stringify([]),
      input.neighborhoodHeadline?.trim() || null,
      input.commuteNotes?.trim() || null,
      JSON.stringify(input.nearbyPlaces ?? []),
      JSON.stringify(input.trustSignals ?? []),
      typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : null,
      typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : null,
      input.locationPrecisionLabel?.trim() || null,
      input.ownerUserId ?? null,
      "free_trial",
      input.ownerName,
      input.ownerEmail,
      input.ownerPhone,
      presentation.ownerRole,
      presentation.ownerResponseTime,
      presentation.ownerVerified,
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

  const listing = await db
    .prepare(`SELECT owner_user_id FROM listings WHERE slug = ? LIMIT 1`)
    .bind(input.listingSlug)
    .first<{ owner_user_id: number | null }>();

  if (listing?.owner_user_id) {
    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["enquiry", listing.owner_user_id, input.listingSlug, input.applicantName, input.contact]),
      userId: listing.owner_user_id,
      category: "enquiry_activity",
      title: `New enquiry for ${input.listingTitle}`,
      message: `${input.applicantName} sent an enquiry. Contact: ${input.contact}.`,
      href: "/owner/dashboard/",
      level: "info",
    });
  }
}

export async function saveSearch(db: D1Like, input: SavedSearchInput) {
  const filters = normalizeListingFilters(input.filters);
  const routeQuery = buildSavedSearchQuery(filters);
  const filtersJson = JSON.stringify(filters);
  const name = input.name.trim() || buildSavedSearchName(filters);
  const resultCount = (await searchListings(filters, db)).length;

  const existing = await db
    .prepare(
      `SELECT id
       FROM saved_searches
       WHERE user_id = ?
         AND route_query = ?
       LIMIT 1`
    )
    .bind(input.userId, routeQuery)
    .first<{ id: number }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE saved_searches
         SET name = ?, filters_json = ?, last_result_count = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(name, filtersJson, resultCount, existing.id)
      .run();

    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["saved-search", input.userId, existing.id, routeQuery]),
      userId: input.userId,
      category: "saved_search_matches",
      title: "Saved search updated",
      message: `${name} is saved and currently has ${resultCount} matching listings.`,
      href: routeQuery ? `/listings/?${routeQuery}` : "/listings/",
      level: "info",
    });

    return { ok: true as const, id: existing.id, routeQuery };
  }

  await db
    .prepare(
      `INSERT INTO saved_searches (
        user_id, name, route_query, filters_json, last_result_count
      ) VALUES (?, ?, ?, ?, ?)`
    )
    .bind(input.userId, name, routeQuery, filtersJson, resultCount)
    .run();

  const created = await db
    .prepare(
      `SELECT id
       FROM saved_searches
       WHERE user_id = ?
         AND route_query = ?
       LIMIT 1`
    )
    .bind(input.userId, routeQuery)
    .first<{ id: number }>();

  if (created?.id) {
    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["saved-search", input.userId, created.id, routeQuery]),
      userId: input.userId,
      category: "saved_search_matches",
      title: "Saved search created",
      message: `${name} is saved and currently has ${resultCount} matching listings.`,
      href: routeQuery ? `/listings/?${routeQuery}` : "/listings/",
      level: "info",
    });
  }

  return { ok: true as const, routeQuery };
}

export async function deleteSavedSearch(db: D1Like, userId: number, id: number) {
  await db
    .prepare(`DELETE FROM saved_searches WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .run();

  return { ok: true as const };
}

export async function saveListingForBuyer(db: D1Like, userId: number, listingSlug: string) {
  const existing = await db
    .prepare(
      `SELECT id
       FROM saved_listings
       WHERE user_id = ?
         AND listing_slug = ?
       LIMIT 1`
    )
    .bind(userId, listingSlug)
    .first<{ id: number }>();

  if (existing) {
    return { ok: true as const, duplicate: true };
  }

  await db
    .prepare(`INSERT INTO saved_listings (user_id, listing_slug) VALUES (?, ?)`)
    .bind(userId, listingSlug)
    .run();

  await db
    .prepare(`UPDATE listings SET saves = saves + 1 WHERE slug = ?`)
    .bind(listingSlug)
    .run();

  const listing = await getListingBySlug(listingSlug, db);
  if (listing) {
    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["saved-listing", userId, listingSlug]),
      userId,
      category: "saved_listing_updates",
      title: "Listing saved",
      message: `${listing.title} was added to your saved listings.`,
      href: `/listings/${listingSlug}/`,
      level: "info",
    });
  }

  return { ok: true as const, duplicate: false };
}

export async function removeSavedListingForBuyer(db: D1Like, userId: number, listingSlug: string) {
  const existing = await db
    .prepare(
      `SELECT id
       FROM saved_listings
       WHERE user_id = ?
         AND listing_slug = ?
       LIMIT 1`
    )
    .bind(userId, listingSlug)
    .first<{ id: number }>();

  if (!existing) {
    return { ok: true as const, removed: false };
  }

  await db
    .prepare(`DELETE FROM saved_listings WHERE id = ?`)
    .bind(existing.id)
    .run();

  await db
    .prepare(`UPDATE listings SET saves = CASE WHEN saves > 0 THEN saves - 1 ELSE 0 END WHERE slug = ?`)
    .bind(listingSlug)
    .run();

  return { ok: true as const, removed: true };
}

export async function isListingSavedByUser(db: D1Like | undefined, userId: number | undefined, listingSlug: string) {
  if (!db || !userId || !listingSlug) return false;

  const existing = await db
    .prepare(
      `SELECT id
       FROM saved_listings
       WHERE user_id = ?
         AND listing_slug = ?
       LIMIT 1`
    )
    .bind(userId, listingSlug)
    .first<{ id: number }>();

  return Boolean(existing);
}

export async function getSavedSearchRecords(db: D1Like, userId: number) {
  const savedSearchesResult = await db
    .prepare(
      `SELECT id, name, route_query, filters_json, last_result_count, created_at, updated_at
       FROM saved_searches
       WHERE user_id = ?
       ORDER BY updated_at DESC, created_at DESC`
    )
    .bind(userId)
    .all<SavedSearchRecord>();

  return savedSearchesResult.results.map((search) => ({
    ...search,
    filters: parseSavedSearchFilters(search.filters_json),
  }));
}

export async function getSavedListingRecords(db: D1Like, userId: number) {
  const savedListingsResult = await db
    .prepare(
      `SELECT id, listing_slug, created_at
       FROM saved_listings
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<SavedListingRecord>();

  return Promise.all(
    savedListingsResult.results.map(async (savedListing) => ({
      ...savedListing,
      listing: await getListingBySlug(savedListing.listing_slug, db),
    }))
  );
}
