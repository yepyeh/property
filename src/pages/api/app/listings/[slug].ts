import type { APIRoute } from "astro";
import { getListingBySlug } from "../../../../lib/listings";
import { getDB } from "../../../../lib/runtime";

export const GET: APIRoute = async ({ params, locals }) => {
  const slug = params.slug || "";
  const listing = await getListingBySlug(slug, getDB(locals.runtime));

  if (!listing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({ listing });
};
