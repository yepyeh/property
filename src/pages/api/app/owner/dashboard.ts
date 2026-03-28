import type { APIRoute } from "astro";
import { getDB, getDashboardData } from "../../../../lib/marketplace";

export const GET: APIRoute = async ({ locals }) => {
  const owner = locals.owner;
  const db = getDB(locals.runtime);

  if (!owner || !db) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const dashboard = await getDashboardData(owner.id, db);

  return Response.json({
    owner,
    ...dashboard,
  });
};
