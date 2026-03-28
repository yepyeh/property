import {
  buildListingLocationContext,
  buildListingNeighborhoodContext,
  getListingBySlug as getSeededListingBySlug,
  listings as seededListings,
  type Listing,
} from "../data/listings";

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

interface ExpiryEmailRuntimeLike extends RuntimeLike {
  env?: RuntimeLike["env"] & {
    RESEND_API_KEY?: string;
    NOTIFICATION_FROM_EMAIL?: string;
  };
}

export interface NotificationPreferences {
  user_id: number;
  email_enabled: number;
  in_app_enabled: number;
  cadence: "daily" | "weekly";
  listing_expiry: number;
  enquiry_activity: number;
  billing_events: number;
  saved_search_matches: number;
  saved_listing_updates: number;
  created_at?: string;
  updated_at?: string;
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
  neighborhood_headline: string | null;
  commute_notes: string | null;
  nearby_places: string;
  trust_signals: string;
  lat: number | null;
  lng: number | null;
  location_precision_label: string | null;
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
  neighborhoodHeadline?: string;
  commuteNotes?: string;
  nearbyPlaces?: string[];
  trustSignals?: string[];
  lat?: number | null;
  lng?: number | null;
  locationPrecisionLabel?: string;
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

export interface SavedSearchInput {
  userId: number;
  name: string;
  filters: ListingFilters;
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

export interface ExpiryNotification {
  listingSlug: string;
  listingTitle: string;
  level: "info" | "warning" | "critical";
  category: "trial" | "paid" | "promoted";
  message: string;
  ctaLabel: string;
  planType: string;
  dueAt: string;
}

export interface SavedSearchRecord {
  id: number;
  name: string;
  route_query: string;
  filters_json: string;
  last_result_count: number;
  created_at: string;
  updated_at: string;
  filters?: ListingFilters;
}

export interface SavedListingRecord {
  id: number;
  listing_slug: string;
  created_at: string;
  listing?: Listing | null;
}

export interface ExpiryEmailDeliveryRecord {
  event_key: string;
  owner_email: string;
  listing_slug: string;
  listing_title: string;
  category: string;
  level: string;
  due_at: string;
  status: string;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface InboxNotificationRecord {
  id: number;
  event_key: string;
  user_id: number;
  category: string;
  title: string;
  message: string;
  href: string | null;
  level: "info" | "warning" | "critical";
  read_at: string | null;
  created_at: string;
}

interface ExpiryEmailCandidate extends ExpiryNotification {
  ownerUserId: number | null;
  ownerEmail: string;
}

export function getDB(runtime?: RuntimeLike | null) {
  return runtime?.env?.DB;
}

export function isExpiryEmailEnabled(runtime?: ExpiryEmailRuntimeLike | null) {
  return Boolean(runtime?.env?.RESEND_API_KEY && runtime?.env?.NOTIFICATION_FROM_EMAIL);
}

export async function ensureNotificationPreferences(db: D1Like, userId: number) {
  await db
    .prepare(
      `INSERT INTO notification_preferences (
        user_id, email_enabled, in_app_enabled, cadence,
        listing_expiry, enquiry_activity, billing_events, saved_search_matches, saved_listing_updates
      ) VALUES (?, 1, 1, 'daily', 1, 1, 1, 1, 1)
      ON CONFLICT(user_id) DO NOTHING`
    )
    .bind(userId)
    .run();
}

export async function getNotificationPreferences(db: D1Like | undefined, userId: number | undefined) {
  if (!db || !userId) return null;
  await ensureNotificationPreferences(db, userId);

  return db
    .prepare(
      `SELECT user_id, email_enabled, in_app_enabled, cadence, listing_expiry,
              enquiry_activity, billing_events, saved_search_matches, saved_listing_updates,
              created_at, updated_at
       FROM notification_preferences
       WHERE user_id = ?
       LIMIT 1`
    )
    .bind(userId)
    .first<NotificationPreferences>();
}

export async function updateNotificationPreferences(
  db: D1Like,
  userId: number,
  input: {
    emailEnabled: boolean;
    inAppEnabled: boolean;
    cadence: "daily" | "weekly";
    listingExpiry: boolean;
    enquiryActivity: boolean;
    billingEvents: boolean;
    savedSearchMatches: boolean;
    savedListingUpdates: boolean;
  }
) {
  await ensureNotificationPreferences(db, userId);

  await db
    .prepare(
      `UPDATE notification_preferences
       SET email_enabled = ?,
           in_app_enabled = ?,
           cadence = ?,
           listing_expiry = ?,
           enquiry_activity = ?,
           billing_events = ?,
           saved_search_matches = ?,
           saved_listing_updates = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`
    )
    .bind(
      input.emailEnabled ? 1 : 0,
      input.inAppEnabled ? 1 : 0,
      input.cadence,
      input.listingExpiry ? 1 : 0,
      input.enquiryActivity ? 1 : 0,
      input.billingEvents ? 1 : 0,
      input.savedSearchMatches ? 1 : 0,
      input.savedListingUpdates ? 1 : 0,
      userId
    )
    .run();

  return { ok: true as const };
}

function buildExpiryEmailEventKey(notification: ExpiryNotification) {
  return `${notification.listingSlug}:${notification.category}:${notification.level}:${notification.dueAt}`;
}

function buildInboxEventKey(parts: Array<string | number | null | undefined>) {
  return parts.filter(Boolean).join(":");
}

export async function upsertInboxNotification(
  db: D1Like,
  input: {
    eventKey: string;
    userId: number;
    category: string;
    title: string;
    message: string;
    href?: string | null;
    level?: "info" | "warning" | "critical";
  }
) {
  await db
    .prepare(
      `INSERT INTO notification_inbox (
        event_key, user_id, category, title, message, href, level
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_key) DO UPDATE SET
        title = excluded.title,
        message = excluded.message,
        href = excluded.href,
        level = excluded.level`
    )
    .bind(
      input.eventKey,
      input.userId,
      input.category,
      input.title,
      input.message,
      input.href ?? null,
      input.level ?? "info"
    )
    .run();
}

export async function getInboxNotifications(db: D1Like | undefined, userId: number | undefined, limit = 50) {
  if (!db || !userId) return [] as InboxNotificationRecord[];

  const result = await db
    .prepare(
      `SELECT id, event_key, user_id, category, title, message, href, level, read_at, created_at
       FROM notification_inbox
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all<InboxNotificationRecord>();

  return result.results;
}

export async function getUnreadInboxNotificationCount(db: D1Like | undefined, userId: number | undefined) {
  if (!db || !userId) return 0;

  const row = await db
    .prepare(
      `SELECT COUNT(*) as count
       FROM notification_inbox
       WHERE user_id = ?
         AND read_at IS NULL`
    )
    .bind(userId)
    .first<{ count: number }>();

  return Number(row?.count || 0);
}

export async function markInboxNotificationRead(db: D1Like, userId: number, id: number) {
  await db
    .prepare(
      `UPDATE notification_inbox
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE id = ?
         AND user_id = ?`
    )
    .bind(id, userId)
    .run();

  return { ok: true as const };
}

export async function markAllInboxNotificationsRead(db: D1Like, userId: number) {
  await db
    .prepare(
      `UPDATE notification_inbox
       SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP)
       WHERE user_id = ?
         AND read_at IS NULL`
    )
    .bind(userId)
    .run();

  return { ok: true as const };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

async function sendExpiryEmail(
  runtime: ExpiryEmailRuntimeLike | null | undefined,
  input: { to: string; subject: string; html: string }
) {
  const apiKey = runtime?.env?.RESEND_API_KEY;
  const from = runtime?.env?.NOTIFICATION_FROM_EMAIL;

  if (!apiKey || !from) {
    return { ok: false as const, error: "missing_config" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!response.ok) {
    return {
      ok: false as const,
      error: "provider_error",
      detail: await response.text(),
    };
  }

  const payload = await response.json<{ id?: string }>();
  return {
    ok: true as const,
    provider: "resend",
    providerMessageId: payload.id ?? null,
  };
}

function buildExpiryEmailContent(notification: ExpiryEmailCandidate, appUrl: string) {
  const dashboardUrl = `${appUrl}/owner/dashboard/`;
  const listingUrl = `${appUrl}/listings/${notification.listingSlug}/`;
  const categoryLabel = notification.category === "trial"
    ? "free trial"
    : notification.category === "paid"
      ? "paid listing"
      : "promotion";

  const subject = `${notification.listingTitle}: ${notification.ctaLabel}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#111827;line-height:1.6">
      <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#0f766e;margin-bottom:8px">Property App 2026</p>
      <h1 style="font-size:28px;margin:0 0 12px">${escapeHtml(notification.listingTitle)}</h1>
      <p style="margin:0 0 16px">Your ${escapeHtml(categoryLabel)} notification is ready.</p>
      <p style="margin:0 0 16px">${escapeHtml(notification.message)}</p>
      <p style="margin:0 0 16px"><strong>Due:</strong> ${escapeHtml(notification.dueAt)}</p>
      <p style="margin:0 0 24px">
        <a href="${dashboardUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#0f766e;color:#fff;text-decoration:none;font-weight:700;margin-right:12px">${escapeHtml(notification.ctaLabel)}</a>
        <a href="${listingUrl}" style="color:#0f766e;text-decoration:none;font-weight:700">Review listing</a>
      </p>
      <p style="font-size:14px;color:#6b7280;margin:0">This email was sent because your listing has a time-based visibility or promotion window.</p>
    </div>
  `;

  return { subject, html };
}

function getDaysUntil(dateValue?: string | null) {
  if (!dateValue) return null;
  const ms = new Date(dateValue).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function buildExpiryNotifications(
  listings: Array<{
    slug: string;
    title: string;
    status: string;
    plan_type: string;
    trial_ends_at?: string | null;
    paid_until?: string | null;
    promoted_until?: string | null;
  }>
) {
  const notifications: ExpiryNotification[] = [];

  for (const listing of listings) {
    const trialDays = getDaysUntil(listing.trial_ends_at);
    const paidDays = getDaysUntil(listing.paid_until);
    const promotedDays = getDaysUntil(listing.promoted_until);

    if (listing.status === "Expired listing") {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "critical",
        category: "trial",
        message: "This listing has expired and is no longer visible to buyers.",
        ctaLabel: "Republish listing",
        planType: listing.plan_type,
        dueAt: listing.trial_ends_at || listing.paid_until || listing.promoted_until || new Date().toISOString(),
      });
      continue;
    }

    if (promotedDays !== null && promotedDays <= 0) {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "warning",
        category: "promoted",
        message: "Promotion has ended. Extend it to keep top placement.",
        ctaLabel: "Extend promotion",
        planType: listing.plan_type,
        dueAt: listing.promoted_until || new Date().toISOString(),
      });
    } else if (promotedDays !== null && promotedDays <= 1) {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "warning",
        category: "promoted",
        message: `Promotion expires in ${promotedDays} day${promotedDays === 1 ? "" : "s"}.`,
        ctaLabel: "Extend promotion",
        planType: listing.plan_type,
        dueAt: listing.promoted_until || new Date().toISOString(),
      });
    } else if (promotedDays !== null && promotedDays <= 3) {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "info",
        category: "promoted",
        message: `Promotion expires in ${promotedDays} days.`,
        ctaLabel: "Review promotion",
        planType: listing.plan_type,
        dueAt: listing.promoted_until || new Date().toISOString(),
      });
    }

    if (paidDays !== null && paidDays <= 0) {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "critical",
        category: "paid",
        message: "Paid coverage has ended. Renew now to keep this listing live.",
        ctaLabel: "Renew paid plan",
        planType: listing.plan_type,
        dueAt: listing.paid_until || new Date().toISOString(),
      });
    } else if (paidDays !== null && paidDays <= 1) {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "warning",
        category: "paid",
        message: `Paid coverage expires in ${paidDays} day${paidDays === 1 ? "" : "s"}.`,
        ctaLabel: "Renew paid plan",
        planType: listing.plan_type,
        dueAt: listing.paid_until || new Date().toISOString(),
      });
    } else if (paidDays !== null && paidDays <= 3) {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "info",
        category: "paid",
        message: `Paid coverage expires in ${paidDays} days.`,
        ctaLabel: "Review renewal",
        planType: listing.plan_type,
        dueAt: listing.paid_until || new Date().toISOString(),
      });
    }

    if (listing.plan_type === "free_trial" && trialDays !== null && trialDays <= 1) {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "warning",
        category: "trial",
        message: `Free trial expires in ${Math.max(trialDays, 0)} day${trialDays === 1 ? "" : "s"}.`,
        ctaLabel: "Upgrade listing",
        planType: listing.plan_type,
        dueAt: listing.trial_ends_at || new Date().toISOString(),
      });
    } else if (listing.plan_type === "free_trial" && trialDays !== null && trialDays <= 3) {
      notifications.push({
        listingSlug: listing.slug,
        listingTitle: listing.title,
        level: "info",
        category: "trial",
        message: `Free trial expires in ${trialDays} days.`,
        ctaLabel: "Review upgrade options",
        planType: listing.plan_type,
        dueAt: listing.trial_ends_at || new Date().toISOString(),
      });
    }
  }

  return notifications.sort((left, right) => new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime());
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
      "Owner submitted",
      "sea",
      input.summary,
      input.description,
      JSON.stringify(["Owner submitted", input.intent === "rent" ? "Rent" : "For sale"]),
      JSON.stringify(["Photos pending", "Direct owner contact", "Dashboard managed", "7-day free trial"]),
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

export async function getDashboardData(ownerUserId: number, db?: D1Like) {
  if (!db) {
    return {
      listings: [],
      enquiries: [],
      payments: [],
      notifications: [],
      savedSearches: [],
      savedListings: [],
      notificationPreferences: null,
      inboxNotifications: [],
      unreadNotificationCount: 0,
    };
  }
  await normalizeExpiredListingPlans(db);
  const notificationPreferences = await getNotificationPreferences(db, ownerUserId);

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

  const savedSearchesResult = await db
    .prepare(
      `SELECT id, name, route_query, filters_json, last_result_count, created_at, updated_at
       FROM saved_searches
       WHERE user_id = ?
       ORDER BY updated_at DESC, created_at DESC`
    )
    .bind(ownerUserId)
    .all<SavedSearchRecord>();

  const savedListingsResult = await db
    .prepare(
      `SELECT id, listing_slug, created_at
       FROM saved_listings
       WHERE user_id = ?
       ORDER BY created_at DESC`
    )
    .bind(ownerUserId)
    .all<SavedListingRecord>();

  const listingRows = listingsResult.results as Array<{
    slug: string;
    title: string;
    status: string;
    plan_type: string;
    trial_ends_at?: string | null;
    paid_until?: string | null;
    promoted_until?: string | null;
  }>;
  const expiryNotifications = notificationPreferences?.in_app_enabled && notificationPreferences?.listing_expiry
    ? buildExpiryNotifications(listingRows)
    : [];

  for (const notification of expiryNotifications) {
    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["expiry", ownerUserId, notification.listingSlug, notification.category, notification.dueAt]),
      userId: ownerUserId,
      category: "listing_expiry",
      title: notification.listingTitle,
      message: notification.message,
      href: `/listings/${notification.listingSlug}/`,
      level: notification.level,
    });
  }

  const inboxNotifications = notificationPreferences?.in_app_enabled
    ? await getInboxNotifications(db, ownerUserId, 8)
    : [];

  return {
    listings: listingsResult.results,
    enquiries: enquiriesResult.results,
    payments: paymentsResult.results,
    notifications: expiryNotifications,
    savedSearches: savedSearchesResult.results.map((search) => ({
      ...search,
      filters: parseSavedSearchFilters(search.filters_json),
    })),
    savedListings: await Promise.all(
      savedListingsResult.results.map(async (savedListing) => ({
        ...savedListing,
        listing: await getListingBySlug(savedListing.listing_slug, db),
      }))
    ),
    notificationPreferences,
    inboxNotifications,
    unreadNotificationCount: inboxNotifications.filter((notification) => !notification.read_at).length,
  };
}

export async function getAdminBillingData(db?: D1Like) {
  if (!db) return { listings: [], payments: [], emailDeliveries: [] };
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

  const emailDeliveriesResult = await db
    .prepare(
      `SELECT event_key, owner_email, listing_slug, listing_title, category, level,
              due_at, status, provider, provider_message_id, error_message, sent_at, created_at
       FROM expiry_email_deliveries
       ORDER BY created_at DESC
       LIMIT 100`
    )
    .bind()
    .all<ExpiryEmailDeliveryRecord>();

  return {
    listings: listingsResult.results,
    payments: paymentsResult.results,
    emailDeliveries: emailDeliveriesResult.results,
  };
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

  if (input.ownerUserId) {
    await upsertInboxNotification(db, {
      eventKey: buildInboxEventKey(["payment", input.ownerUserId, input.stripeSessionId]),
      userId: input.ownerUserId,
      category: "billing_events",
      title: "Payment recorded",
      message: `${input.planType} payment of ${input.amount} ${String(input.currency).toUpperCase()} was recorded.`,
      href: "/owner/dashboard/",
      level: "info",
    });
  }
}

async function getPendingExpiryEmailCandidates(db: D1Like) {
  await normalizeExpiredListingPlans(db);

  const listingsResult = await db
    .prepare(
      `SELECT slug, title, owner_user_id, owner_email, status, plan_type, trial_ends_at, paid_until, promoted_until
       FROM listings
       WHERE owner_email IS NOT NULL
         AND owner_email != ''
       ORDER BY created_at DESC`
    )
    .bind()
    .all<{
      slug: string;
      title: string;
      owner_user_id: number | null;
      owner_email: string;
      status: string;
      plan_type: string;
      trial_ends_at?: string | null;
      paid_until?: string | null;
      promoted_until?: string | null;
    }>();

  const candidates: ExpiryEmailCandidate[] = [];
  const rows = listingsResult.results as Array<{
    slug: string;
    title: string;
    owner_user_id: number | null;
    owner_email: string;
    status: string;
    plan_type: string;
    trial_ends_at?: string | null;
    paid_until?: string | null;
    promoted_until?: string | null;
  }>;

  for (const row of rows) {
    const notifications = buildExpiryNotifications([row]);
    for (const notification of notifications) {
      candidates.push({
        ...notification,
        ownerUserId: row.owner_user_id,
        ownerEmail: row.owner_email,
      });
    }
  }

  return candidates;
}

async function hasSentExpiryEmail(db: D1Like, eventKey: string) {
  const row = await db
    .prepare(
      `SELECT status
       FROM expiry_email_deliveries
       WHERE event_key = ?
       LIMIT 1`
    )
    .bind(eventKey)
    .first<{ status: string }>();

  return row?.status === "sent";
}

async function upsertExpiryEmailDelivery(
  db: D1Like,
  input: {
    eventKey: string;
    ownerUserId: number | null;
    ownerEmail: string;
    listingSlug: string;
    listingTitle: string;
    category: string;
    level: string;
    dueAt: string;
    status: string;
    provider?: string | null;
    providerMessageId?: string | null;
    errorMessage?: string | null;
    sentAt?: string | null;
  }
) {
  await db
    .prepare(
      `INSERT INTO expiry_email_deliveries (
        event_key, owner_user_id, owner_email, listing_slug, listing_title,
        category, level, due_at, status, provider, provider_message_id, error_message, sent_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(event_key) DO UPDATE SET
        status = excluded.status,
        provider = excluded.provider,
        provider_message_id = excluded.provider_message_id,
        error_message = excluded.error_message,
        sent_at = excluded.sent_at`
    )
    .bind(
      input.eventKey,
      input.ownerUserId,
      input.ownerEmail,
      input.listingSlug,
      input.listingTitle,
      input.category,
      input.level,
      input.dueAt,
      input.status,
      input.provider ?? null,
      input.providerMessageId ?? null,
      input.errorMessage ?? null,
      input.sentAt ?? null
    )
    .run();
}

export async function sendPendingExpiryNotificationEmails(
  runtime?: ExpiryEmailRuntimeLike | null,
  options?: { appUrl?: string }
) {
  const db = getDB(runtime);
  if (!db) return { ok: false as const, error: "missing_db" };
  if (!isExpiryEmailEnabled(runtime)) return { ok: false as const, error: "missing_config" };

  const appUrl = options?.appUrl || "https://property-app-2026.steven-896.workers.dev";
  const candidates = await getPendingExpiryEmailCandidates(db);
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const preferences = await getNotificationPreferences(db, candidate.ownerUserId ?? undefined);
    if (!preferences?.email_enabled || !preferences.listing_expiry) {
      skipped += 1;
      continue;
    }

    const eventKey = buildExpiryEmailEventKey(candidate);
    if (await hasSentExpiryEmail(db, eventKey)) {
      skipped += 1;
      continue;
    }

    const emailContent = buildExpiryEmailContent(candidate, appUrl);
    const result = await sendExpiryEmail(runtime, {
      to: candidate.ownerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (!result.ok) {
      failed += 1;
      await upsertExpiryEmailDelivery(db, {
        eventKey,
        ownerUserId: candidate.ownerUserId,
        ownerEmail: candidate.ownerEmail,
        listingSlug: candidate.listingSlug,
        listingTitle: candidate.listingTitle,
        category: candidate.category,
        level: candidate.level,
        dueAt: candidate.dueAt,
        status: "failed",
        errorMessage: result.error === "provider_error" ? result.detail ?? "Provider request failed" : "Email delivery is not configured",
      });
      continue;
    }

    sent += 1;
    await upsertExpiryEmailDelivery(db, {
      eventKey,
      ownerUserId: candidate.ownerUserId,
      ownerEmail: candidate.ownerEmail,
      listingSlug: candidate.listingSlug,
      listingTitle: candidate.listingTitle,
      category: candidate.category,
      level: candidate.level,
      dueAt: candidate.dueAt,
      status: "sent",
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      sentAt: new Date().toISOString(),
    });
  }

  return {
    ok: true as const,
    sent,
    skipped,
    failed,
  };
}
