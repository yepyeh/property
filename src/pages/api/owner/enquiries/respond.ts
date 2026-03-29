import type { APIRoute } from "astro";
import { getDB } from "../../../../lib/runtime";
import { ValidationError, readOptionalText, readText } from "../../../../lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Owner account required", { status: 403 });
  if (!["owner", "admin"].includes(owner.role)) return new Response("Owner account required", { status: 403 });

  try {
    const form = await request.formData();
    const listingSlug = readText(form, "listingSlug", { required: true, maxLength: 120 });
    const contact = readText(form, "contact", { required: true, maxLength: 160 });
    const responseStatus = readText(form, "responseStatus", { required: true, maxLength: 24 });
    const ownerNote = readOptionalText(form, "ownerNote", { maxLength: 300 });

    if (!["new", "responded", "archived"].includes(responseStatus)) {
      return new Response("Invalid response status", { status: 400 });
    }

    const ownedListing = await db
      .prepare(`SELECT slug FROM listings WHERE slug = ? AND owner_user_id = ? LIMIT 1`)
      .bind(listingSlug, owner.id)
      .first<{ slug: string }>();

    if (!ownedListing && owner.role !== "admin") {
      return new Response("Listing not found", { status: 404 });
    }

    await db
      .prepare(
        `UPDATE enquiries
         SET response_status = ?, owner_note = ?, responded_at = CASE WHEN ? = 'responded' THEN CURRENT_TIMESTAMP ELSE responded_at END
         WHERE listing_slug = ? AND contact = ?`
      )
      .bind(responseStatus, ownerNote || null, responseStatus, listingSlug, contact)
      .run();

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/owner/dashboard/?updated=${encodeURIComponent(listingSlug)}&action=enquiry-responded&status=${encodeURIComponent(responseStatus)}`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
