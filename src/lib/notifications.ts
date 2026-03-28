import { normalizeExpiredListingPlans } from "./listing-lifecycle";
import type {
  ExpiryEmailCandidate,
  ExpiryNotification,
  InboxNotificationRecord,
  NotificationPreferences,
} from "./marketplace-types";
import { getDB, type D1Like, type ExpiryEmailRuntimeLike } from "./runtime";

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

export function buildExpiryEmailEventKey(notification: ExpiryNotification) {
  return `${notification.listingSlug}:${notification.category}:${notification.level}:${notification.dueAt}`;
}

export function buildInboxEventKey(parts: Array<string | number | null | undefined>) {
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

export function buildExpiryNotifications(
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

  for (const row of listingsResult.results) {
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
