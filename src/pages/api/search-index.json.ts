import type { APIRoute } from "astro";
import { getAllListings } from "../../lib/listings";
import { getDB } from "../../lib/runtime";
import { buildAreaGuideIndexEntries, buildHelpIndexEntries, buildListingIndexEntries } from "../../lib/search-index";

export const GET: APIRoute = async ({ locals }) => {
  const db = getDB(locals.runtime);
  const locale = locals.locale || "en";
  const listings = await getAllListings(db);
  const entries = [
    ...buildListingIndexEntries(listings, locale),
    ...buildAreaGuideIndexEntries(listings, locale),
    ...(await buildHelpIndexEntries(locale)),
  ];

  return new Response(JSON.stringify({
    generatedAt: new Date().toISOString(),
    locale,
    count: entries.length,
    entries,
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
