import type { APIRoute } from "astro";
import { deleteSavedSearch } from "../../../lib/listings";
import { appendQueryFlag, sanitizeInternalRedirect } from "../../../lib/http";
import { getDB } from "../../../lib/runtime";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Owner account required", { status: 403 });

  const form = await request.formData();
  const id = Number(form.get("id") || 0);
  const redirectTo = sanitizeInternalRedirect(String(form.get("redirectTo") || ""), owner.role === "buyer" ? "/buyer/dashboard/" : "/owner/dashboard/");

  if (!id) return new Response("Invalid saved search id", { status: 400 });

  await deleteSavedSearch(db, owner.id, id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: appendQueryFlag(redirectTo, "savedSearchDeleted"),
    },
  });
};
