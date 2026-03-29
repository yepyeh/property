import type { APIRoute } from "astro";
import { getImageBucket } from "../../../lib/media";
import { getDB } from "../../../lib/runtime";
import { ValidationError, readNumber, readText } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const bucket = getImageBucket(locals.runtime);
  const db = getDB(locals.runtime);

  if (!bucket || !db) {
    return new Response("Storage binding missing", { status: 500 });
  }
  if (!locals.owner) {
    return new Response("Owner account required", { status: 403 });
  }

  try {
    const form = await request.formData();
    const listingSlug = readText(form, "listingSlug", { required: true, maxLength: 120 });
    const imageIndex = readNumber(form, "imageIndex", { required: true, min: 0 });

    const listing = await db
      .prepare(`SELECT image_keys FROM listings WHERE slug = ? AND owner_user_id = ? LIMIT 1`)
      .bind(listingSlug, locals.owner.id)
      .first<{ image_keys?: string }>();

    if (!listing) {
      return new Response("Listing not found", { status: 404 });
    }

    const imageKeys = listing.image_keys ? JSON.parse(listing.image_keys) : [];
    if (!Array.isArray(imageKeys) || imageIndex >= imageKeys.length) {
      return new Response("Image not found", { status: 404 });
    }

    const [removedKey] = imageKeys.splice(imageIndex, 1);
    await bucket.delete(removedKey);

    await db
      .prepare(`UPDATE listings SET image_keys = ? WHERE slug = ?`)
      .bind(JSON.stringify(imageKeys), listingSlug)
      .run();

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/owner/dashboard/?updated=${encodeURIComponent(listingSlug)}&mediaAction=deleted`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
