import type { APIRoute } from "astro";
import { getDB, saveListingForBuyer } from "../../lib/marketplace";
import { appendQueryFlag, sanitizeInternalRedirect } from "../../lib/http";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Account required", { status: 403 });
  if (!["buyer", "admin"].includes(owner.role)) return new Response("Buyer account required", { status: 403 });

  const form = await request.formData();
  const listingSlug = String(form.get("listingSlug") || "");
  const redirectTo = sanitizeInternalRedirect(String(form.get("redirectTo") || ""), `/listings/${listingSlug}/`);

  if (!listingSlug) return new Response("Listing slug required", { status: 400 });

  await saveListingForBuyer(db, owner.id, listingSlug);

  return new Response(null, {
    status: 303,
    headers: {
      Location: appendQueryFlag(redirectTo, "savedListing"),
    },
  });
};
