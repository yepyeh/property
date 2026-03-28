import type { APIRoute } from "astro";
import { deleteSavedSearch, getDB, saveSearch } from "../../lib/marketplace";

function parseFilters(form: FormData) {
  return {
    intent: String(form.get("intent") || "buy"),
    city: String(form.get("city") || ""),
    district: String(form.get("district") || ""),
    propertyType: String(form.get("propertyType") || ""),
    minPrice: Number(form.get("minPrice") || "") || undefined,
    maxPrice: Number(form.get("maxPrice") || "") || undefined,
    minBeds: Number(form.get("minBeds") || "") || undefined,
    sort: String(form.get("sort") || "newest"),
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Owner account required", { status: 403 });

  const form = await request.formData();
  const result = await saveSearch(db, {
    userId: owner.id,
    name: String(form.get("name") || ""),
    filters: parseFilters(form),
  });

  if (!result.ok) {
    return new Response("Unable to save search", { status: 400 });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: `/listings/?${result.routeQuery}&saved=1`,
    },
  });
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Owner account required", { status: 403 });

  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id") || 0);

  if (!id) return new Response("Invalid saved search id", { status: 400 });

  await deleteSavedSearch(db, owner.id, id);
  return Response.json({ ok: true });
};
