import type { APIRoute } from "astro";
import { getImageBucket } from "../../lib/media";

export const GET: APIRoute = async ({ params, locals }) => {
  const keyParam = params.key;
  const bucket = getImageBucket(locals.runtime);

  if (!keyParam || !bucket) {
    return new Response("Image not found", { status: 404 });
  }

  const object = await bucket.get(keyParam);

  if (!object || !object.body) {
    return new Response("Image not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
