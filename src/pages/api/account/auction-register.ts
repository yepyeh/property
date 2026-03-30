import type { APIRoute } from "astro";
import { appendQueryFlag, sanitizeInternalRedirect } from "../../../lib/http";
import { saveAuctionBidderRegistrationForBuyer } from "../../../lib/listings";
import { getDB } from "../../../lib/runtime";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Account required", { status: 403 });
  if (!["buyer", "admin"].includes(owner.role)) return new Response("Buyer account required", { status: 403 });

  const form = await request.formData();
  const listingSlug = String(form.get("listingSlug") || "").trim();
  const redirectTo = sanitizeInternalRedirect(String(form.get("redirectTo") || ""), `/listings/${listingSlug}/`);
  const registrationMethod = String(form.get("registrationMethod") || "online").trim();
  const maxProxyBidValue = String(form.get("maxProxyBid") || "").trim();
  const bidderNote = String(form.get("bidderNote") || "").trim();

  if (!listingSlug) return new Response("Listing slug required", { status: 400 });
  if (!["online", "telephone", "absentee"].includes(registrationMethod)) {
    return new Response("Valid registration method required", { status: 400 });
  }

  await saveAuctionBidderRegistrationForBuyer(db, owner.id, {
    listingSlug,
    registrationMethod: registrationMethod as "online" | "telephone" | "absentee",
    maxProxyBid: maxProxyBidValue ? Number(maxProxyBidValue) : null,
    bidderNote: bidderNote || null,
    confirmIdentity: form.get("confirmIdentity") === "on",
    confirmFunds: form.get("confirmFunds") === "on",
    confirmTerms: form.get("confirmTerms") === "on",
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: appendQueryFlag(redirectTo, "auctionRegistered"),
    },
  });
};
