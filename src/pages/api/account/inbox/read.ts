import type { APIRoute } from "astro";
import { getDB, markInboxNotificationRead } from "../../../../lib/marketplace";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Account required", { status: 403 });

  const form = await request.formData();
  const id = Number(form.get("id") || 0);

  if (!id) return new Response("Invalid notification id", { status: 400 });

  await markInboxNotificationRead(db, owner.id, id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/account/inbox?read=1",
    },
  });
};
