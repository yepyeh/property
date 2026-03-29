import type { APIRoute } from "astro";
import { sanitizeInternalRedirect } from "../../../lib/http";
import { markSavedSearchVisited } from "../../../lib/listings";
import { getDB } from "../../../lib/runtime";

export const GET: APIRoute = async ({ url, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Account required", { status: 403 });

  const id = Number(url.searchParams.get("id") || 0);
  const fallback = sanitizeInternalRedirect(url.searchParams.get("redirectTo"), "/listings/");

  if (!id) {
    return new Response(null, {
      status: 303,
      headers: { Location: fallback },
    });
  }

  const result = await markSavedSearchVisited(db, owner.id, id);
  const location = result.ok && result.routeQuery ? `/listings/?${result.routeQuery}` : fallback;

  return new Response(null, {
    status: 303,
    headers: { Location: location },
  });
};
