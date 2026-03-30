import {
  buildListingLocationContext,
  buildListingNeighborhoodContext,
  getAuctionPhase,
  getListingBySlug as getSeededListingBySlug,
  listings as seededListings,
  type Listing,
} from "../data/listings";
import { buildInitialListingPresentation } from "./listing-defaults";
import { normalizeExpiredListingPlans } from "./listing-lifecycle";
import type {
  AuctionEventRecord,
  AuctionBidderRegistrationRecord,
  AuctionWatchRecord,
  EnquiryInput,
  ListingFilters,
  ListingInput,
  ListingRow,
  SavedListingRecord,
  SavedSearchInput,
  SavedSearchRecord,
} from "./marketplace-types";
import type { D1Like } from "./runtime";
import { buildInboxEventKey, getNotificationPreferences, upsertInboxNotification } from "./notifications";

function normalizeTextFilter(value?: string) {
  return value?.trim().toLowerCase() || "";
}

function normalizeSort(value?: string) {
  return value === "price-asc" || value === "price-desc" || value === "beds-desc" ? value : "newest";
}

function normalizeListingFilters(filters: ListingFilters) {
  return {
    intent: filters.intent === "rent" ? "rent" : "buy",
    country: filters.country?.trim() || "",
    city: filters.city?.trim() || "",
    district: filters.district?.trim() || "",
    propertyType: filters.propertyType?.trim() || "",
    saleMode: filters.saleMode === "auction" ? "auction" : filters.saleMode === "private-sale" ? "private-sale" : "",
    minPrice: typeof filters.minPrice === "number" && Number.isFinite(filters.minPrice) ? filters.minPrice : undefined,
    maxPrice: typeof filters.maxPrice === "number" && Number.isFinite(filters.maxPrice) ? filters.maxPrice : undefined,
    minBeds: typeof filters.minBeds === "number" && Number.isFinite(filters.minBeds) ? filters.minBeds : undefined,
    sort: normalizeSort(filters.sort),
  } satisfies ListingFilters;
}

function buildDynamicListingWhere(filters: ListingFilters, options: { createdAfter?: string } = {}) {
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

  if (filters.country) {
    clauses.push("LOWER(country) LIKE ?");
    values.push(`%${normalizeTextFilter(filters.country)}%`);
  }

  if (filters.district) {
    clauses.push("LOWER(district) LIKE ?");
    values.push(`%${normalizeTextFilter(filters.district)}%`);
  }

  if (filters.propertyType) {
    clauses.push("property_type = ?");
    values.push(filters.propertyType);
  }

  if (filters.saleMode === "auction" || filters.saleMode === "private-sale") {
    clauses.push("COALESCE(sale_mode, 'private-sale') = ?");
    values.push(filters.saleMode);
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

  if (options.createdAfter) {
    clauses.push("created_at > ?");
    values.push(options.createdAfter);
  }

  return { clauses, values };
}

export function buildSavedSearchQuery(filters: ListingFilters) {
  const normalized = normalizeListingFilters(filters);
  const params = new URLSearchParams();

  params.set("intent", normalized.intent || "buy");
  if (normalized.country) params.set("country", normalized.country);
  if (normalized.city) params.set("city", normalized.city);
  if (normalized.district) params.set("district", normalized.district);
  if (normalized.propertyType) params.set("propertyType", normalized.propertyType);
  if (normalized.saleMode) params.set("saleMode", normalized.saleMode);
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
    normalized.country || "All countries",
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
    country: row.country,
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
    saleMode: (row.sale_mode as Listing["saleMode"]) || "private-sale",
    auction:
      (row.sale_mode || "private-sale") === "auction"
        ? {
            startsAt: row.auction_starts_at,
            endsAt: row.auction_ends_at,
            startingPriceLabel: row.auction_starting_price_label,
            reservePriceLabel: row.auction_reserve_price_label,
            terms: row.auction_terms,
            phase:
              getAuctionPhase({
                startsAt: row.auction_starts_at,
                endsAt: row.auction_ends_at,
              }) || "scheduled",
          }
        : undefined,
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

  const { clauses, values } = buildDynamicListingWhere(filters);

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

async function countNewListingsForSavedSearch(db: D1Like, search: SavedSearchRecord) {
  const filters = search.filters ?? parseSavedSearchFilters(search.filters_json);
  const { clauses, values } = buildDynamicListingWhere(filters, { createdAfter: search.updated_at });
  const result = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM listings
       WHERE ${clauses.join(" AND ")}`
    )
    .bind(...values)
    .first<{ count: number }>();

  return Number(result?.count || 0);
}

function applyListingFilters(listings: Listing[], filters: ListingFilters) {
  const country = normalizeTextFilter(filters.country);
  const city = normalizeTextFilter(filters.city);
  const district = normalizeTextFilter(filters.district);
  const sort = normalizeSort(filters.sort);

  const filtered = listings.filter((listing) => {
    if ((filters.intent === "buy" || filters.intent === "rent") && listing.intent !== filters.intent) return false;
    if (country && !listing.country.toLowerCase().includes(country)) return false;
    if (city && !listing.city.toLowerCase().includes(city)) return false;
    if (district && !listing.district.toLowerCase().includes(district)) return false;
    if (filters.propertyType && listing.type !== filters.propertyType) return false;
    if (filters.saleMode && (listing.saleMode || "private-sale") !== filters.saleMode) return false;
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
  if (!db) return seededListings;
  return getDynamicListings(db);
}

export async function searchListings(filters: ListingFilters, db?: D1Like) {
  if (!db) return applyListingFilters(seededListings, filters);

  const result = await getFilteredDynamicListings(filters, db);

  if (normalizeSort(filters.sort) === "newest") {
    return result;
  }

  return applyListingFilters(result, filters);
}

export async function getListingBySlug(slug: string, db?: D1Like) {
  if (!db) return getSeededListingBySlug(slug);

  await normalizeExpiredListingPlans(db);
  const row = await db
    .prepare(`SELECT * FROM listings WHERE slug = ? LIMIT 1`)
    .bind(slug)
    .first<ListingRow>();

  return row ? mapRowToListing(row) : undefined;
}

export async function createListing(db: D1Like, input: ListingInput) {
  const baseSlug = slugify(`${input.title}-${input.city}-${input.district}`);
  const slug = await ensureUniqueListingSlug(db, baseSlug || `listing-${Date.now()}`);
  const saleMode = input.saleMode === "auction" ? "auction" : "private-sale";
  const presentation = buildInitialListingPresentation(input.intent, saleMode);
  const status = input.statusLabel?.trim() || presentation.status;
  const tone = input.tone?.trim() || presentation.tone;
  const tags = input.tags?.length ? input.tags : presentation.tags;
  const features = input.features?.length ? input.features : presentation.features;
  const ownerRole = input.ownerRole?.trim() || presentation.ownerRole;
  const ownerResponseTime = input.ownerResponseTime?.trim() || presentation.ownerResponseTime;
  const ownerVerified = input.ownerVerified ? 1 : presentation.ownerVerified;

  await db
    .prepare(
      `INSERT INTO listings (
        slug, title, country, city, district, ward, property_type, intent,
        price_label, numeric_price, price_unit, beds, baths, area,
        status, tone, summary, description,
        tags, features, image_keys,
        neighborhood_headline, commute_notes, nearby_places, trust_signals,
        lat, lng, location_precision_label,
        sale_mode, auction_starts_at, auction_ends_at, auction_starting_price_label, auction_reserve_price_label, auction_terms,
        owner_user_id, plan_type, trial_ends_at,
        owner_name, owner_email, owner_phone, owner_role, owner_response_time, owner_verified,
        views_24h, saves, enquiries, published
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+7 days'), ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
    )
    .bind(
      slug,
      input.title,
      input.country,
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
      status,
      tone,
      input.summary,
      input.description,
      JSON.stringify(tags),
      JSON.stringify(features),
      JSON.stringify([]),
      input.neighborhoodHeadline?.trim() || null,
      input.commuteNotes?.trim() || null,
      JSON.stringify(input.nearbyPlaces ?? []),
      JSON.stringify(input.trustSignals ?? []),
      typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : null,
      typeof input.lng === "number" && Number.isFinite(input.lng) ? input.lng : null,
      input.locationPrecisionLabel?.trim() || null,
      saleMode,
      input.auctionStartsAt?.trim() || null,
      input.auctionEndsAt?.trim() || null,
      input.auctionStartingPriceLabel?.trim() || null,
      input.auctionReservePriceLabel?.trim() || null,
      input.auctionTerms?.trim() || null,
      input.ownerUserId ?? null,
      "free_trial",
      input.ownerName,
      input.ownerEmail,
      input.ownerPhone,
      ownerRole,
      ownerResponseTime,
      ownerVerified,
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
        listing_slug, listing_title, applicant_name, contact, message, preferred_time, applicant_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(input.listingSlug, input.listingTitle, input.applicantName, input.contact, input.message, input.preferredTime, input.applicantUserId ?? null)
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

export async function getBuyerEnquiryRecords(db: D1Like, userId: number) {
  const enquiries = await db
    .prepare(
      `SELECT e.listing_slug, e.listing_title, e.applicant_name, e.contact, e.message, e.preferred_time, e.created_at,
              e.response_status, e.owner_note, e.responded_at,
              l.city, l.district, l.ward, l.price_label
       FROM enquiries e
       LEFT JOIN listings l ON l.slug = e.listing_slug
       WHERE e.applicant_user_id = ?
       ORDER BY e.created_at DESC`
    )
    .bind(userId)
    .all<{
      listing_slug: string;
      listing_title: string;
      applicant_name: string;
      contact: string;
      message: string;
      preferred_time: string | null;
      created_at: string;
      response_status: string | null;
      owner_note: string | null;
      responded_at: string | null;
      city: string | null;
      district: string | null;
      ward: string | null;
      price_label: string | null;
    }>();

  return enquiries.results;
}

export async function recordRecentlyViewedListing(db: D1Like | undefined, userId: number | undefined, listingSlug: string) {
  if (!db || !userId || !listingSlug) return;

  await db
    .prepare(
      `INSERT INTO recent_views (user_id, listing_slug, created_at, updated_at)
       VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, listing_slug)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP`
    )
    .bind(userId, listingSlug)
    .run();
}

export async function getRecentlyViewedRecords(db: D1Like, userId: number) {
  const recentViews = await db
    .prepare(
      `SELECT listing_slug, updated_at
       FROM recent_views
       WHERE user_id = ?
       ORDER BY updated_at DESC
       LIMIT 6`
    )
    .bind(userId)
    .all<{ listing_slug: string; updated_at: string }>();

  return Promise.all(
    recentViews.results.map(async (recentView) => ({
      ...recentView,
      listing: await getListingBySlug(recentView.listing_slug, db),
    }))
  );
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
    .prepare(`INSERT INTO saved_listings (user_id, listing_slug, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)`)
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

export async function updateSavedListingForBuyer(
  db: D1Like,
  userId: number,
  input: {
    listingSlug: string;
    buyerState: "saved" | "finalist" | "contacted" | "follow_up";
    followUpOn?: string | null;
    buyerNote?: string | null;
    collectionName?: string | null;
  }
) {
  const existing = await db
    .prepare(
      `SELECT id
       FROM saved_listings
       WHERE user_id = ?
         AND listing_slug = ?
       LIMIT 1`
    )
    .bind(userId, input.listingSlug)
    .first<{ id: number }>();

  if (!existing) {
    return { ok: false as const, reason: "missing" };
  }

  await db
    .prepare(
       `UPDATE saved_listings
       SET buyer_state = ?,
           follow_up_on = ?,
           buyer_note = ?,
           collection_name = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?
         AND listing_slug = ?`
    )
    .bind(
      input.buyerState,
      input.followUpOn ?? null,
      input.buyerNote?.trim() || null,
      input.collectionName?.trim() || null,
      userId,
      input.listingSlug
    )
    .run();

  return { ok: true as const };
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

  return Promise.all(
    savedSearchesResult.results.map(async (search) => {
      const filters = parseSavedSearchFilters(search.filters_json);
      const newResultCount = await countNewListingsForSavedSearch(db, { ...search, filters });

      return {
        ...search,
        filters,
        new_result_count: newResultCount,
        freshness_label: newResultCount > 0 ? `${newResultCount} new since last visit` : "No new matches since last visit",
      };
    })
  );
}

export async function markSavedSearchVisited(db: D1Like, userId: number, id: number) {
  const existing = await db
    .prepare(
      `SELECT id, filters_json
       FROM saved_searches
       WHERE id = ? AND user_id = ?
       LIMIT 1`
    )
    .bind(id, userId)
    .first<{ id: number; filters_json: string }>();

  if (!existing) return { ok: false as const };

  const filters = parseSavedSearchFilters(existing.filters_json);
  const resultCount = (await searchListings(filters, db)).length;

  await db
    .prepare(
      `UPDATE saved_searches
       SET last_result_count = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
    .bind(resultCount, id, userId)
    .run();

  return { ok: true as const, routeQuery: buildSavedSearchQuery(filters) };
}

export async function getSavedListingRecords(db: D1Like, userId: number) {
  const savedListingsResult = await db
    .prepare(
      `SELECT id, listing_slug, created_at, updated_at, buyer_state, follow_up_on, buyer_note, collection_name
       FROM saved_listings
       WHERE user_id = ?
       ORDER BY
         CASE buyer_state
           WHEN 'finalist' THEN 0
           WHEN 'follow_up' THEN 0
           WHEN 'contacted' THEN 1
           ELSE 3
         END,
         COALESCE(follow_up_on, updated_at, created_at) DESC`
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

export async function getAuctionWatchRecord(db: D1Like | undefined, userId: number | undefined, listingSlug: string) {
  if (!db || !userId || !listingSlug) return null;

  return db
    .prepare(
      `SELECT w.id, w.listing_slug, w.max_bid_amount, w.notify_outbid, w.notify_over_max_bid, w.notify_unsold_under,
              w.notify_starting_soon, w.notify_ending_soon, w.created_at, w.updated_at,
              r.status as registration_status, r.registration_method, r.max_proxy_bid,
              (SELECT e.event_type FROM auction_events e WHERE e.listing_slug = w.listing_slug ORDER BY e.created_at DESC LIMIT 1) as latest_event_type,
              (SELECT e.title FROM auction_events e WHERE e.listing_slug = w.listing_slug ORDER BY e.created_at DESC LIMIT 1) as latest_event_title,
              (SELECT e.created_at FROM auction_events e WHERE e.listing_slug = w.listing_slug ORDER BY e.created_at DESC LIMIT 1) as latest_event_at,
              (SELECT e.value_label FROM auction_events e WHERE e.listing_slug = w.listing_slug ORDER BY e.created_at DESC LIMIT 1) as latest_event_value_label
       FROM auction_watchers w
       LEFT JOIN auction_bidder_registrations r
         ON r.user_id = w.user_id
        AND r.listing_slug = w.listing_slug
       WHERE w.user_id = ?
         AND w.listing_slug = ?
       LIMIT 1`
    )
    .bind(userId, listingSlug)
    .first<AuctionWatchRecord>();
}

export async function getAuctionWatchRecords(db: D1Like, userId: number) {
  const result = await db
    .prepare(
      `SELECT w.id, w.listing_slug, w.max_bid_amount, w.notify_outbid, w.notify_over_max_bid, w.notify_unsold_under,
              w.notify_starting_soon, w.notify_ending_soon, w.created_at, w.updated_at,
              r.status as registration_status, r.registration_method, r.max_proxy_bid,
              (SELECT e.event_type FROM auction_events e WHERE e.listing_slug = w.listing_slug ORDER BY e.created_at DESC LIMIT 1) as latest_event_type,
              (SELECT e.title FROM auction_events e WHERE e.listing_slug = w.listing_slug ORDER BY e.created_at DESC LIMIT 1) as latest_event_title,
              (SELECT e.created_at FROM auction_events e WHERE e.listing_slug = w.listing_slug ORDER BY e.created_at DESC LIMIT 1) as latest_event_at,
              (SELECT e.value_label FROM auction_events e WHERE e.listing_slug = w.listing_slug ORDER BY e.created_at DESC LIMIT 1) as latest_event_value_label
       FROM auction_watchers w
       LEFT JOIN auction_bidder_registrations r
         ON r.user_id = w.user_id
        AND r.listing_slug = w.listing_slug
       WHERE w.user_id = ?
       ORDER BY w.updated_at DESC, w.created_at DESC`
    )
    .bind(userId)
    .all<AuctionWatchRecord>();

  return Promise.all(
    result.results.map(async (watch) => ({
      ...watch,
      listing: await getListingBySlug(watch.listing_slug, db),
    }))
  );
}

export async function saveAuctionWatchForBuyer(
  db: D1Like,
  userId: number,
  input: {
    listingSlug: string;
    maxBidAmount?: number | null;
    notifyOutbid: boolean;
    notifyOverMaxBid: boolean;
    notifyUnsoldUnder?: number | null;
    notifyStartingSoon: boolean;
    notifyEndingSoon: boolean;
  }
) {
  await db
    .prepare(
      `INSERT INTO auction_watchers (
         user_id, listing_slug, max_bid_amount, notify_outbid, notify_over_max_bid, notify_unsold_under,
         notify_starting_soon, notify_ending_soon, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, listing_slug) DO UPDATE SET
         max_bid_amount = excluded.max_bid_amount,
         notify_outbid = excluded.notify_outbid,
         notify_over_max_bid = excluded.notify_over_max_bid,
         notify_unsold_under = excluded.notify_unsold_under,
         notify_starting_soon = excluded.notify_starting_soon,
         notify_ending_soon = excluded.notify_ending_soon,
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      userId,
      input.listingSlug,
      input.maxBidAmount ?? null,
      input.notifyOutbid ? 1 : 0,
      input.notifyOverMaxBid ? 1 : 0,
      input.notifyUnsoldUnder ?? null,
      input.notifyStartingSoon ? 1 : 0,
      input.notifyEndingSoon ? 1 : 0
    )
    .run();

  const listing = await getListingBySlug(input.listingSlug, db);
  if (listing) {
    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["auction-watch", userId, input.listingSlug]),
      userId,
      category: "saved_listing_updates",
      title: "Auction watch updated",
      message: `${listing.title} is now on your auction watchlist with refined alerts.`,
      href: `/listings/${input.listingSlug}/`,
      level: "info",
    });
  }

  return { ok: true as const };
}

export async function removeAuctionWatchForBuyer(db: D1Like, userId: number, listingSlug: string) {
  await db
    .prepare(`DELETE FROM auction_watchers WHERE user_id = ? AND listing_slug = ?`)
    .bind(userId, listingSlug)
    .run();

  return { ok: true as const };
}

export async function getAuctionBidderRegistrationRecord(db: D1Like | undefined, userId: number | undefined, listingSlug: string) {
  if (!db || !userId || !listingSlug) return null;

  return db
    .prepare(
      `SELECT id, listing_slug, registration_method, max_proxy_bid, bidder_note,
              confirm_identity, confirm_funds, confirm_terms, status, created_at, updated_at
       FROM auction_bidder_registrations
       WHERE user_id = ?
         AND listing_slug = ?
       LIMIT 1`
    )
    .bind(userId, listingSlug)
    .first<AuctionBidderRegistrationRecord>();
}

export async function saveAuctionBidderRegistrationForBuyer(
  db: D1Like,
  userId: number,
  input: {
    listingSlug: string;
    registrationMethod: "online" | "telephone" | "absentee";
    maxProxyBid?: number | null;
    bidderNote?: string | null;
    confirmIdentity: boolean;
    confirmFunds: boolean;
    confirmTerms: boolean;
  }
) {
  await db
    .prepare(
      `INSERT INTO auction_bidder_registrations (
         user_id, listing_slug, registration_method, max_proxy_bid, bidder_note,
         confirm_identity, confirm_funds, confirm_terms, status, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'registered', CURRENT_TIMESTAMP)
       ON CONFLICT(user_id, listing_slug) DO UPDATE SET
         registration_method = excluded.registration_method,
         max_proxy_bid = excluded.max_proxy_bid,
         bidder_note = excluded.bidder_note,
         confirm_identity = excluded.confirm_identity,
         confirm_funds = excluded.confirm_funds,
         confirm_terms = excluded.confirm_terms,
         status = 'registered',
         updated_at = CURRENT_TIMESTAMP`
    )
    .bind(
      userId,
      input.listingSlug,
      input.registrationMethod,
      input.maxProxyBid ?? null,
      input.bidderNote?.trim() || null,
      input.confirmIdentity ? 1 : 0,
      input.confirmFunds ? 1 : 0,
      input.confirmTerms ? 1 : 0
    )
    .run();

  const listing = await getListingBySlug(input.listingSlug, db);
  if (listing) {
    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["auction-registration", userId, input.listingSlug]),
      userId,
      category: "saved_listing_updates",
      title: "Bidder registration saved",
      message: `${listing.title} is now marked as a registered auction interest with your preferred bidding route.`,
      href: `/listings/${input.listingSlug}/`,
      level: "info",
    });
  }

  return { ok: true as const };
}

export async function withdrawAuctionBidderRegistrationForBuyer(db: D1Like, userId: number, listingSlug: string) {
  await db
    .prepare(
      `UPDATE auction_bidder_registrations
       SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND listing_slug = ?`
    )
    .bind(userId, listingSlug)
    .run();

  return { ok: true as const };
}

export async function getAuctionEventRecords(db: D1Like | undefined, listingSlug: string, limit = 20) {
  if (!db || !listingSlug) return [] as AuctionEventRecord[];

  const result = await db
    .prepare(
      `SELECT id, listing_slug, event_type, title, message, value_label, numeric_value, is_public, created_by_user_id, created_at
       FROM auction_events
       WHERE listing_slug = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(listingSlug, limit)
    .all<AuctionEventRecord>();

  return result.results;
}

function shouldNotifyAuctionWatcher(
  watch: {
    notify_outbid: number;
    notify_over_max_bid: number;
    notify_starting_soon: number;
    notify_ending_soon: number;
    max_bid_amount?: number | null;
    notify_unsold_under?: number | null;
  },
  event: { eventType: string; numericValue?: number | null }
) {
  if (event.eventType === "starting_soon") return Boolean(watch.notify_starting_soon);
  if (event.eventType === "ending_soon") return Boolean(watch.notify_ending_soon);
  if (event.eventType === "bid_placed") {
    if (watch.notify_over_max_bid && typeof event.numericValue === "number" && typeof watch.max_bid_amount === "number") {
      return event.numericValue > watch.max_bid_amount;
    }
    return Boolean(watch.notify_outbid);
  }
  if (event.eventType === "passed_in") {
    if (typeof watch.notify_unsold_under === "number" && typeof event.numericValue === "number") {
      return event.numericValue <= watch.notify_unsold_under;
    }
    return false;
  }
  return ["registration_open", "reserve_met", "extended", "sold", "status_update"].includes(event.eventType);
}

export async function createAuctionEvent(
  db: D1Like,
  actorUserId: number,
  input: {
    listingSlug: string;
    eventType: AuctionEventRecord["event_type"];
    title: string;
    message: string;
    valueLabel?: string | null;
    numericValue?: number | null;
    isPublic?: boolean;
  }
) {
  await db
    .prepare(
      `INSERT INTO auction_events (
         listing_slug, event_type, title, message, value_label, numeric_value, is_public, created_by_user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.listingSlug,
      input.eventType,
      input.title,
      input.message,
      input.valueLabel ?? null,
      input.numericValue ?? null,
      input.isPublic === false ? 0 : 1,
      actorUserId
    )
    .run();

  const listing = await getListingBySlug(input.listingSlug, db);
  if (!listing) return { ok: true as const };

  const watchersResult = await db
    .prepare(
      `SELECT DISTINCT user_id, max_bid_amount, notify_outbid, notify_over_max_bid, notify_unsold_under, notify_starting_soon, notify_ending_soon
       FROM auction_watchers
       WHERE listing_slug = ?`
    )
    .bind(input.listingSlug)
    .all<{
      user_id: number;
      max_bid_amount?: number | null;
      notify_outbid: number;
      notify_over_max_bid: number;
      notify_unsold_under?: number | null;
      notify_starting_soon: number;
      notify_ending_soon: number;
    }>();

  const bidderResult = await db
    .prepare(
      `SELECT DISTINCT user_id
       FROM auction_bidder_registrations
       WHERE listing_slug = ?
         AND status = 'registered'`
    )
    .bind(input.listingSlug)
    .all<{ user_id: number }>();

  const recipientIds = new Set<number>();

  for (const watch of watchersResult.results) {
    if (shouldNotifyAuctionWatcher(watch, { eventType: input.eventType, numericValue: input.numericValue })) {
      recipientIds.add(watch.user_id);
    }
  }

  if (["registration_open", "reserve_met", "extended", "ending_soon", "sold", "passed_in"].includes(input.eventType)) {
    for (const bidder of bidderResult.results) {
      recipientIds.add(bidder.user_id);
    }
  }

  for (const recipientId of recipientIds) {
    const preferences = await getNotificationPreferences(db, recipientId);
    if (!preferences?.in_app_enabled || !preferences.saved_listing_updates) continue;

    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["auction-event", input.listingSlug, recipientId, input.eventType, input.title]),
      userId: recipientId,
      category: "saved_listing_updates",
      title: input.title,
      message: input.valueLabel ? `${input.message} ${input.valueLabel}` : input.message,
      href: `/listings/${input.listingSlug}/`,
      level:
        input.eventType === "ending_soon" || input.eventType === "bid_placed"
          ? "warning"
          : input.eventType === "sold"
            ? "critical"
            : "info",
    });
  }

  return { ok: true as const };
}
