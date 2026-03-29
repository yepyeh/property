import type { D1Like } from "./runtime";

export async function createListingReport(
  db: D1Like,
  input: {
    listingSlug: string;
    reporterUserId?: number | null;
    reporterName?: string | null;
    reporterContact?: string | null;
    reason: string;
    details?: string | null;
  }
) {
  await db
    .prepare(
      `INSERT INTO listing_reports (
        listing_slug, reporter_user_id, reporter_name, reporter_contact, reason, details
      ) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.listingSlug,
      input.reporterUserId ?? null,
      input.reporterName?.trim() || null,
      input.reporterContact?.trim() || null,
      input.reason.trim(),
      input.details?.trim() || null
    )
    .run();
}

export async function requestOwnerVerification(
  db: D1Like,
  userId: number,
  ownerNote?: string | null
) {
  const existing = await db
    .prepare(
      `SELECT id, status
       FROM owner_verification_requests
       WHERE user_id = ?
       ORDER BY submitted_at DESC
       LIMIT 1`
    )
    .bind(userId)
    .first<{ id: number; status: string }>();

  if (existing?.status === "pending") {
    return { ok: false as const, reason: "pending" };
  }

  await db
    .prepare(
      `INSERT INTO owner_verification_requests (user_id, status, owner_note)
       VALUES (?, 'pending', ?)`
    )
    .bind(userId, ownerNote?.trim() || null)
    .run();

  return { ok: true as const };
}

export async function getOwnerVerificationStatus(db: D1Like, userId: number) {
  return db
    .prepare(
      `SELECT status, owner_note, reviewed_note, submitted_at, reviewed_at
       FROM owner_verification_requests
       WHERE user_id = ?
       ORDER BY submitted_at DESC
       LIMIT 1`
    )
    .bind(userId)
    .first<{
      status: string;
      owner_note: string | null;
      reviewed_note: string | null;
      submitted_at: string;
      reviewed_at: string | null;
    }>();
}
