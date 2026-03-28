import type { APIRoute } from "astro";
import { deleteSavedSearch, saveSearch } from "../../lib/listings";
import { getDB } from "../../lib/runtime";
import { ValidationError, readEnum, readNumber, readOptionalText } from "../../lib/validation";

function parseFilters(form: FormData) {
  return {
    intent: readEnum(form, "intent", ["buy", "rent"], "buy"),
    city: readOptionalText(form, "city", { maxLength: 120 }),
    district: readOptionalText(form, "district", { maxLength: 120 }),
    propertyType: readOptionalText(form, "propertyType", { maxLength: 40 }),
    minPrice: readNumber(form, "minPrice", { min: 0 }),
    maxPrice: readNumber(form, "maxPrice", { min: 0 }),
    minBeds: readNumber(form, "minBeds", { min: 0, max: 99 }),
    sort: readEnum(form, "sort", ["newest", "price-asc", "price-desc", "beds-desc"], "newest"),
  };
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Owner account required", { status: 403 });

  try {
    const form = await request.formData();
    const result = await saveSearch(db, {
      userId: owner.id,
      name: readOptionalText(form, "name", { maxLength: 160 }),
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
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
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
