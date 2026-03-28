import type { APIRoute } from "astro";
import { getDB, getListingBySlug } from "../../../../lib/marketplace";

export const GET: APIRoute = async ({ params, locals }) => {
  const slug = params.slug || "";
  const listing = await getListingBySlug(slug, getDB(locals.runtime));

  if (!listing) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({ listing });
};
