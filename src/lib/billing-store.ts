import { normalizeExpiredListingPlans } from "./listing-lifecycle";
import type { ListingPlanUpdateInput, PaymentRecordInput } from "./marketplace-types";
import { buildInboxEventKey, upsertInboxNotification } from "./notifications";
import type { D1Like } from "./runtime";

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
