import type { APIRoute } from "astro";
import { BILLING_PRODUCTS, createCheckoutSession } from "../../../lib/billing";
import { getDB } from "../../../lib/runtime";

export const POST: APIRoute = async ({ request, locals, url }) => {
  const owner = locals.owner;
  const db = getDB(locals.runtime);

  if (!owner || !db) {
    return new Response("Owner account required", { status: 403 });
  }

  const form = await request.formData();
  const listingSlug = String(form.get("listingSlug") || "");
  const planType = String(form.get("planType") || "");

  if (!listingSlug || !(planType in BILLING_PRODUCTS)) {
    return new Response("Invalid checkout request", { status: 400 });
  }

  const listing = await db
    .prepare(`SELECT slug, title, owner_user_id FROM listings WHERE slug = ? LIMIT 1`)
    .bind(listingSlug)
    .first<{ slug: string; title: string; owner_user_id: number | null }>();

  if (!listing) {
    return new Response("Listing not found", { status: 404 });
  }

  if (listing.owner_user_id !== owner.id) {
    return new Response("Forbidden", { status: 403 });
  }

  const session = await createCheckoutSession(locals.runtime, {
    appUrl: url.origin,
    listingSlug,
    listingTitle: listing.title,
    ownerUserId: owner.id,
    planType: planType as "paid" | "promoted",
  });

  if (!session.ok) {
    return new Response("Stripe checkout is not configured yet", { status: 503 });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: session.url,
    },
  });
};
