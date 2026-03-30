import type { APIRoute } from "astro";
import { appendQueryFlag, sanitizeInternalRedirect } from "../../../lib/http";
import { createAuctionEvent } from "../../../lib/listings";
import type { AuctionEventRecord } from "../../../lib/marketplace-types";
import { getDB } from "../../../lib/runtime";

const allowedTypes = new Set([
  "registration_open",
  "starting_soon",
  "bid_placed",
  "reserve_met",
  "extended",
  "ending_soon",
  "sold",
  "passed_in",
  "status_update",
]);

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner || !["owner", "admin"].includes(owner.role)) return new Response("Owner account required", { status: 403 });

  const form = await request.formData();
  const listingSlug = String(form.get("listingSlug") || "").trim();
  const eventType = String(form.get("eventType") || "").trim();
  const title = String(form.get("title") || "").trim();
  const message = String(form.get("message") || "").trim();
  const valueLabel = String(form.get("valueLabel") || "").trim();
  const numericValueRaw = String(form.get("numericValue") || "").trim();
  const redirectTo = sanitizeInternalRedirect(String(form.get("redirectTo") || ""), `/owner/listings/${listingSlug}/`);

  if (!listingSlug || !title || !message || !allowedTypes.has(eventType)) {
    return new Response("Valid auction event input required", { status: 400 });
  }

  await createAuctionEvent(db, owner.id, {
    listingSlug,
    eventType: eventType as AuctionEventRecord["event_type"],
    title,
    message,
    valueLabel: valueLabel || null,
    numericValue: numericValueRaw ? Number(numericValueRaw) : null,
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: appendQueryFlag(redirectTo, "auctionEventAdded"),
    },
  });
};
