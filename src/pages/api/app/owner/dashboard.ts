import type { APIRoute } from "astro";
import { getDB, getOwnerDashboardData } from "../../../../lib/marketplace";

export const GET: APIRoute = async ({ locals }) => {
  const owner = locals.owner;
  const db = getDB(locals.runtime);

  if (!owner || !db) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const dashboard = await getOwnerDashboardData(owner.id, db);

  return Response.json({
    owner,
    ...dashboard,
  });
};
