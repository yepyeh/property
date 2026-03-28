import type { APIRoute } from "astro";
import { getImageBucket, makeImageKey } from "../../lib/media";
import { getDB } from "../../lib/marketplace";

export const POST: APIRoute = async ({ request, locals }) => {
  const bucket = getImageBucket(locals.runtime);
  const db = getDB(locals.runtime);

  if (!bucket || !db) {
    return new Response("Storage binding missing", { status: 500 });
  }

  const form = await request.formData();
  const listingSlug = String(form.get("listingSlug") || "");
  const file = form.get("image");

  if (!listingSlug || !(file instanceof File) || !file.size) {
    return new Response("Missing listing slug or image file", { status: 400 });
  }

  const key = makeImageKey(listingSlug, file.name || "listing-image");
  const bytes = await file.arrayBuffer();

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
  });

  const imageKeysResult = await db
    .prepare(`SELECT image_keys FROM listings WHERE slug = ? LIMIT 1`)
    .bind(listingSlug)
    .first<{ image_keys?: string }>();

  const existing = imageKeysResult?.image_keys ? JSON.parse(imageKeysResult.image_keys) : [];
  existing.push(key);

  await db
    .prepare(`UPDATE listings SET image_keys = ? WHERE slug = ?`)
    .bind(JSON.stringify(existing), listingSlug)
    .run();

  return new Response(null, {
    status: 303,
    headers: {
      Location: `/owner/dashboard/?uploaded=${encodeURIComponent(listingSlug)}`,
    },
  });
};
