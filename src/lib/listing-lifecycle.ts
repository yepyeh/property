import type { D1Like } from "./runtime";

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
