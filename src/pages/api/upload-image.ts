import type { APIRoute } from "astro";
import { getImageBucket, makeImageKey } from "../../lib/media";
import { getDB } from "../../lib/runtime";
import { ValidationError, readText } from "../../lib/validation";

const ALLOWED_IMAGE_TYPES = new Set(["image/webp"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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
    const files = form.getAll("image").filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return new Response("At least one image file is required", { status: 400 });
    }

    if (files.length > 8) {
      return new Response("Upload up to 8 images at a time", { status: 400 });
    }

    const imageKeysResult = await db
      .prepare(`SELECT image_keys FROM listings WHERE slug = ? AND owner_user_id = ? LIMIT 1`)
      .bind(listingSlug, locals.owner.id)
      .first<{ image_keys?: string }>();

    if (!imageKeysResult) {
      return new Response("Listing not found", { status: 404 });
    }

    const existing = imageKeysResult.image_keys ? JSON.parse(imageKeysResult.image_keys) : [];

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return new Response("Images must be converted to WebP before upload", { status: 400 });
      }

      if (file.size > MAX_IMAGE_BYTES) {
        return new Response("Image file is too large", { status: 400 });
      }

      const key = makeImageKey(listingSlug, file.name || "listing-image", "webp");
      const bytes = await file.arrayBuffer();

      await bucket.put(key, bytes, {
        httpMetadata: {
          contentType: file.type,
        },
      });

      existing.push(key);
    }

    await db
      .prepare(`UPDATE listings SET image_keys = ? WHERE slug = ?`)
      .bind(JSON.stringify(existing), listingSlug)
      .run();

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/owner/dashboard/?uploaded=${encodeURIComponent(listingSlug)}&uploadCount=${files.length}&action=gallery-uploaded`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
