import type { APIRoute } from "astro";
import { getDB, searchListings } from "../../../lib/marketplace";

export const GET: APIRoute = async ({ url, locals }) => {
  const params = url.searchParams;
  const filters = {
    intent: params.get("intent") || undefined,
    city: params.get("city") || undefined,
    district: params.get("district") || undefined,
    propertyType: params.get("propertyType") || undefined,
    minPrice: Number(params.get("minPrice") || "") || undefined,
    maxPrice: Number(params.get("maxPrice") || "") || undefined,
    minBeds: Number(params.get("minBeds") || "") || undefined,
    sort: params.get("sort") || undefined,
  };

  const listings = await searchListings(filters, getDB(locals.runtime));

  return Response.json({
    filters,
    total: listings.length,
    listings,
  });
};
