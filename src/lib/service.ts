import type { ConciergeRequestRecord } from "./marketplace-types";
import type { D1Like } from "./runtime";

export async function createConciergeRequest(
  db: D1Like,
  input: {
    requesterUserId?: number | null;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    requestType: string;
    marketIntent?: string | null;
    city?: string | null;
    budgetLabel?: string | null;
    timelineLabel?: string | null;
    message: string;
  }
) {
  await db
    .prepare(
      `INSERT INTO concierge_requests (
        requester_user_id, name, email, phone, role, request_type,
        market_intent, city, budget_label, timeline_label, message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.requesterUserId ?? null,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      input.phone?.trim() || null,
      input.role.trim(),
      input.requestType.trim(),
      input.marketIntent?.trim() || null,
      input.city?.trim() || null,
      input.budgetLabel?.trim() || null,
      input.timelineLabel?.trim() || null,
      input.message.trim()
    )
    .run();
}

export async function getRecentConciergeRequests(db: D1Like, limit = 100) {
  const result = await db
    .prepare(
      `SELECT id, requester_user_id, name, email, phone, role, request_type,
              market_intent, city, budget_label, timeline_label, message, status, created_at
       FROM concierge_requests
       ORDER BY
         CASE status WHEN 'open' THEN 0 ELSE 1 END,
         created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<ConciergeRequestRecord>();

  return result.results;
}
