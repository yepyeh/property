import type { APIRoute } from "astro";
import { getDB, markAllInboxNotificationsRead } from "../../../../lib/marketplace";

export const POST: APIRoute = async ({ locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Account required", { status: 403 });

  await markAllInboxNotificationsRead(db, owner.id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/account/inbox?allRead=1",
    },
  });
};
