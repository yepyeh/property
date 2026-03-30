import type { APIRoute } from "astro";
import { getDB } from "../../../lib/runtime";
import { ValidationError, readNumber, readText } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);

  if (!db) return new Response("Storage binding missing", { status: 500 });
  if (!locals.owner) return new Response("Owner account required", { status: 403 });

  try {
    const form = await request.formData();
    const listingSlug = readText(form, "listingSlug", { required: true, maxLength: 120 });
    const focusX = readNumber(form, "focusX", { required: true, min: 0, max: 100 });
    const focusY = readNumber(form, "focusY", { required: true, min: 0, max: 100 });

    const result = await db
      .prepare(`UPDATE listings SET cover_focus_x = ?, cover_focus_y = ? WHERE slug = ? AND owner_user_id = ?`)
      .bind(focusX, focusY, listingSlug, locals.owner.id)
      .run();

    if (!result.success) {
      return new Response("Listing not found", { status: 404 });
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/owner/dashboard/?updated=${encodeURIComponent(listingSlug)}&mediaAction=focal&action=gallery-updated`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
