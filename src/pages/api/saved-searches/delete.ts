import type { APIRoute } from "astro";
import { deleteSavedSearch, getDB } from "../../../lib/marketplace";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Owner account required", { status: 403 });

  const form = await request.formData();
  const id = Number(form.get("id") || 0);

  if (!id) return new Response("Invalid saved search id", { status: 400 });

  await deleteSavedSearch(db, owner.id, id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/owner/dashboard/?savedSearchDeleted=1",
    },
  });
};
