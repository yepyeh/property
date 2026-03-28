import type { APIRoute } from "astro";
import { createEnquiry, getDB } from "../../lib/marketplace";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  if (!db) {
    return new Response("D1 database binding missing", { status: 500 });
  }

  const form = await request.formData();
  const listingSlug = String(form.get("listingSlug") || "");

  await createEnquiry(db, {
    listingSlug,
    listingTitle: String(form.get("listingTitle") || ""),
    applicantName: String(form.get("applicantName") || ""),
    contact: String(form.get("contact") || ""),
    message: String(form.get("message") || ""),
    preferredTime: String(form.get("preferredTime") || ""),
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: `/listings/${listingSlug}/?enquiry=sent`,
    },
  });
};
