import { normalizeExpiredListingPlans } from "./listing-lifecycle";
import { getBuyerEnquiryRecords, getRecentlyViewedRecords, getSavedListingRecords, getSavedSearchRecords } from "./listings";
import type {
  ExpiryEmailDeliveryRecord,
  NotificationPreferences,
} from "./marketplace-types";
import { getOwnerVerificationStatus } from "./trust";
import {
  buildExpiryNotifications,
  buildInboxEventKey,
  getInboxNotifications,
  getNotificationPreferences,
  getUnreadInboxNotificationCount,
  upsertInboxNotification,
} from "./notifications";
import type { D1Like } from "./runtime";

async function getInboxState(db: D1Like, userId: number, enabled: boolean) {
  const inboxNotifications = enabled ? await getInboxNotifications(db, userId, 8) : [];
  const unreadNotificationCount = enabled ? await getUnreadInboxNotificationCount(db, userId) : 0;

  return { inboxNotifications, unreadNotificationCount };
}

async function syncOwnerExpiryInboxNotifications(
  db: D1Like,
  ownerUserId: number,
  notificationPreferences: NotificationPreferences | null,
  listingRows: Array<{
    slug: string;
    title: string;
    status: string;
    plan_type: string;
    trial_ends_at?: string | null;
    paid_until?: string | null;
    promoted_until?: string | null;
  }>
) {
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

  return expiryNotifications;
}

export async function getOwnerDashboardData(ownerUserId: number, db?: D1Like) {
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
      verificationStatus: null,
    };
  }
  await normalizeExpiredListingPlans(db);
  const notificationPreferences = await getNotificationPreferences(db, ownerUserId);

  const listingsResult = await db
    .prepare(
      `SELECT slug, title, city, district, intent, status, created_at, enquiries,
              image_keys, plan_type, trial_ends_at, paid_until, promoted_until, views_24h, saves
       FROM listings
       WHERE owner_user_id = ?
       ORDER BY created_at DESC`
    )
    .bind(ownerUserId)
    .all();

  const enquiriesResult = await db
    .prepare(
      `SELECT e.listing_slug, e.listing_title, e.applicant_name, e.contact, e.preferred_time, e.created_at,
              e.response_status, e.owner_note, e.responded_at
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

  const listingRows = listingsResult.results as Array<{
    slug: string;
    title: string;
    status: string;
    plan_type: string;
    trial_ends_at?: string | null;
    paid_until?: string | null;
    promoted_until?: string | null;
  }>;

  const expiryNotifications = await syncOwnerExpiryInboxNotifications(db, ownerUserId, notificationPreferences, listingRows);
  const { inboxNotifications, unreadNotificationCount } = await getInboxState(
    db,
    ownerUserId,
    Boolean(notificationPreferences?.in_app_enabled)
  );

  return {
    listings: listingsResult.results,
    enquiries: enquiriesResult.results,
    payments: paymentsResult.results,
    notifications: expiryNotifications,
    savedSearches: await getSavedSearchRecords(db, ownerUserId),
    savedListings: await getSavedListingRecords(db, ownerUserId),
    notificationPreferences,
    inboxNotifications,
    unreadNotificationCount,
    verificationStatus: await getOwnerVerificationStatus(db, ownerUserId),
  };
}

export async function getBuyerDashboardData(userId: number, db?: D1Like) {
  if (!db) {
    return {
      savedSearches: [],
      savedListings: [],
      enquiries: [],
      recentlyViewed: [],
      notificationPreferences: null,
      inboxNotifications: [],
      unreadNotificationCount: 0,
    };
  }

  const notificationPreferences = await getNotificationPreferences(db, userId);
  const { inboxNotifications, unreadNotificationCount } = await getInboxState(
    db,
    userId,
    Boolean(notificationPreferences?.in_app_enabled)
  );

  const savedSearches = await getSavedSearchRecords(db, userId);

  if (notificationPreferences?.in_app_enabled && notificationPreferences?.saved_search_matches) {
    for (const search of savedSearches) {
      if ((search.new_result_count || 0) > 0) {
        await upsertInboxNotification(db, {
          eventKey: buildInboxEventKey(["saved-search-freshness", userId, search.id, search.updated_at]),
          userId,
          category: "saved_search_matches",
          title: search.name,
          message: `${search.new_result_count} new listing${search.new_result_count === 1 ? "" : "s"} match this saved search since your last visit.`,
          href: search.route_query ? `/api/saved-searches/visit?id=${search.id}&redirectTo=${encodeURIComponent(`/listings/?${search.route_query}`)}` : `/api/saved-searches/visit?id=${search.id}&redirectTo=/listings/`,
          level: search.new_result_count > 3 ? "warning" : "info",
        });
      }
    }
  }

  return {
    savedSearches,
    savedListings: await getSavedListingRecords(db, userId),
    enquiries: await getBuyerEnquiryRecords(db, userId),
    recentlyViewed: await getRecentlyViewedRecords(db, userId),
    notificationPreferences,
    inboxNotifications,
    unreadNotificationCount,
  };
}

export async function getAdminBillingData(db?: D1Like) {
  if (!db) return { listings: [], payments: [], emailDeliveries: [], performanceSeries: [], verificationRequests: [], listingReports: [] };
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

  const verificationRequestsResult = await db
    .prepare(
      `SELECT vr.id, vr.user_id, vr.status, vr.owner_note, vr.reviewed_note, vr.submitted_at, vr.reviewed_at,
              u.full_name, u.email
       FROM owner_verification_requests vr
       JOIN users u ON u.id = vr.user_id
       ORDER BY
         CASE vr.status WHEN 'pending' THEN 0 ELSE 1 END,
         vr.submitted_at DESC
       LIMIT 100`
    )
    .bind()
    .all();

  const listingReportsResult = await db
    .prepare(
      `SELECT id, listing_slug, reporter_name, reporter_contact, reason, details, status, created_at
       FROM listing_reports
       ORDER BY
         CASE status WHEN 'open' THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT 100`
    )
    .bind()
    .all();

  const [listingSeriesResult, enquirySeriesResult, paymentSeriesResult] = await Promise.all([
    db.prepare(
      `SELECT DATE(created_at) as day, COUNT(*) as count
       FROM listings
       WHERE created_at >= datetime('now', '-6 days')
       GROUP BY DATE(created_at)
       ORDER BY day ASC`
    ).bind().all<{ day: string; count: number }>(),
    db.prepare(
      `SELECT DATE(created_at) as day, COUNT(*) as count
       FROM enquiries
       WHERE created_at >= datetime('now', '-6 days')
       GROUP BY DATE(created_at)
       ORDER BY day ASC`
    ).bind().all<{ day: string; count: number }>(),
    db.prepare(
      `SELECT DATE(COALESCE(paid_at, created_at)) as day, COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue
       FROM payments
       WHERE COALESCE(paid_at, created_at) >= datetime('now', '-6 days')
       GROUP BY DATE(COALESCE(paid_at, created_at))
       ORDER BY day ASC`
    ).bind().all<{ day: string; count: number; revenue: number }>(),
  ]);

  const listingCounts = new Map(listingSeriesResult.results.map((row) => [row.day, Number(row.count || 0)]));
  const enquiryCounts = new Map(enquirySeriesResult.results.map((row) => [row.day, Number(row.count || 0)]));
  const paymentCounts = new Map(
    paymentSeriesResult.results.map((row) => [row.day, { count: Number(row.count || 0), revenue: Number(row.revenue || 0) }])
  );

  const performanceSeries = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - offset));
    const isoDay = date.toISOString().slice(0, 10);
    const paymentDay = paymentCounts.get(isoDay) || { count: 0, revenue: 0 };

    return {
      day: isoDay,
      listings: listingCounts.get(isoDay) || 0,
      enquiries: enquiryCounts.get(isoDay) || 0,
      payments: paymentDay.count,
      revenue: paymentDay.revenue,
    };
  });

  return {
    listings: listingsResult.results,
    payments: paymentsResult.results,
    emailDeliveries: emailDeliveriesResult.results,
    performanceSeries,
    verificationRequests: verificationRequestsResult.results,
    listingReports: listingReportsResult.results,
  };
}

export async function getOwnerListingDetail(ownerUserId: number, listingSlug: string, db?: D1Like) {
  if (!db) {
    return { listing: null, enquiries: [], payments: [] };
  }

  await normalizeExpiredListingPlans(db);

  const listing = await db
    .prepare(
      `SELECT slug, title, city, district, ward, intent, status, created_at, enquiries,
              image_keys, plan_type, trial_ends_at, paid_until, promoted_until, views_24h, saves
       FROM listings
       WHERE owner_user_id = ?
         AND slug = ?
       LIMIT 1`
    )
    .bind(ownerUserId, listingSlug)
    .first<{
      slug: string;
      title: string;
      city: string;
      district: string;
      ward: string;
      intent: string;
      status: string;
      created_at: string;
      enquiries: number;
      image_keys: string;
      plan_type: string;
      trial_ends_at?: string | null;
      paid_until?: string | null;
      promoted_until?: string | null;
      views_24h?: number;
      saves?: number;
    }>();

  if (!listing) {
    return { listing: null, enquiries: [], payments: [] };
  }

  const enquiriesResult = await db
    .prepare(
      `SELECT applicant_name, contact, message, preferred_time, created_at, response_status, owner_note, responded_at
       FROM enquiries
       WHERE listing_slug = ?
       ORDER BY created_at DESC`
    )
    .bind(listingSlug)
    .all();

  const paymentsResult = await db
    .prepare(
      `SELECT stripe_session_id, plan_type, amount, currency, status, created_at, paid_at
       FROM payments
       WHERE owner_user_id = ?
         AND listing_slug = ?
       ORDER BY created_at DESC`
    )
    .bind(ownerUserId, listingSlug)
    .all();

  return {
    listing,
    enquiries: enquiriesResult.results,
    payments: paymentsResult.results,
  };
}
