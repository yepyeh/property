import type { APIRoute } from "astro";
import { getDB } from "../../../lib/runtime";
import { ValidationError, readNumber, readText } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);

  if (!db) {
    return new Response("Storage binding missing", { status: 500 });
  }
  if (!locals.owner) {
    return new Response("Owner account required", { status: 403 });
  }

  try {
    const form = await request.formData();
    const listingSlug = readText(form, "listingSlug", { required: true, maxLength: 120 });
    const imageIndex = readNumber(form, "imageIndex", { required: true, min: 0 });
    const direction = readText(form, "direction", { required: true, maxLength: 8 });

    if (!["left", "right"].includes(direction)) {
      return new Response("Invalid reorder direction", { status: 400 });
    }

    const listing = await db
      .prepare(`SELECT image_keys FROM listings WHERE slug = ? AND owner_user_id = ? LIMIT 1`)
      .bind(listingSlug, locals.owner.id)
      .first<{ image_keys?: string }>();

    if (!listing) {
      return new Response("Listing not found", { status: 404 });
    }

    const imageKeys = listing.image_keys ? JSON.parse(listing.image_keys) : [];
    if (!Array.isArray(imageKeys) || imageKeys.length < 2 || imageIndex >= imageKeys.length) {
      return new Response("Reorder not possible", { status: 400 });
    }

    const targetIndex = direction === "left" ? imageIndex - 1 : imageIndex + 1;
    if (targetIndex < 0 || targetIndex >= imageKeys.length) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: `/owner/dashboard/?updated=${encodeURIComponent(listingSlug)}&mediaAction=reordered&action=gallery-updated`,
        },
      });
    }

    [imageKeys[imageIndex], imageKeys[targetIndex]] = [imageKeys[targetIndex], imageKeys[imageIndex]];

    await db
      .prepare(`UPDATE listings SET image_keys = ? WHERE slug = ?`)
      .bind(JSON.stringify(imageKeys), listingSlug)
      .run();

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/owner/dashboard/?updated=${encodeURIComponent(listingSlug)}&mediaAction=reordered&action=gallery-updated`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
