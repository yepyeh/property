import type { APIRoute } from "astro";
import { appendQueryFlag, sanitizeInternalRedirect } from "../../../lib/http";
import { updateSavedListingForBuyer } from "../../../lib/listings";
import { getDB } from "../../../lib/runtime";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Account required", { status: 403 });
  if (!["buyer", "admin"].includes(owner.role)) return new Response("Buyer account required", { status: 403 });

  const form = await request.formData();
  const listingSlug = String(form.get("listingSlug") || "").trim();
  const buyerState = String(form.get("buyerState") || "saved").trim();
  const redirectTo = sanitizeInternalRedirect(String(form.get("redirectTo") || ""), "/buyer/dashboard/");

  if (!listingSlug) return new Response("Listing slug required", { status: 400 });
  if (!["saved", "finalist", "contacted", "follow_up"].includes(buyerState)) return new Response("Invalid buyer state", { status: 400 });

  await updateSavedListingForBuyer(db, owner.id, {
    listingSlug,
    buyerState: buyerState as "saved" | "finalist" | "contacted" | "follow_up",
    followUpOn: String(form.get("followUpOn") || "").trim() || null,
    buyerNote: String(form.get("buyerNote") || "").trim() || null,
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: appendQueryFlag(redirectTo, "savedListingUpdated"),
    },
  });
};
