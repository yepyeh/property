import { normalizeExpiredListingPlans } from "./listing-lifecycle";
import { getSavedListingRecords, getSavedSearchRecords } from "./listings";
import type {
  ExpiryEmailDeliveryRecord,
  NotificationPreferences,
} from "./marketplace-types";
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
  };
}

export async function getBuyerDashboardData(userId: number, db?: D1Like) {
  if (!db) {
    return {
      savedSearches: [],
      savedListings: [],
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

  return {
    savedSearches: await getSavedSearchRecords(db, userId),
    savedListings: await getSavedListingRecords(db, userId),
    notificationPreferences,
    inboxNotifications,
    unreadNotificationCount,
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
