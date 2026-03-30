import type { APIRoute } from "astro";
import { getFlowDraft, saveFlowDraft } from "../../lib/flow-drafts";
import { getDB } from "../../lib/runtime";

export const GET: APIRoute = async ({ locals, url }) => {
  if (!locals.owner || !["owner", "admin"].includes(locals.owner.role)) {
    return new Response(JSON.stringify({ error: "Owner account required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = getDB(locals.runtime);
  if (!db) {
    return new Response(JSON.stringify({ error: "Database unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const flowType = url.searchParams.get("flowType") || "listing_publish";
  const draft = await getFlowDraft(db, locals.owner.id, flowType);

  return new Response(JSON.stringify({ draft }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.owner || !["owner", "admin"].includes(locals.owner.role)) {
    return new Response(JSON.stringify({ error: "Owner account required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const db = getDB(locals.runtime);
  if (!db) {
    return new Response(JSON.stringify({ error: "Database unavailable" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return new Response(JSON.stringify({ error: "Invalid payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const flowType = String(body.flowType || "listing_publish");
  const payload = (body.payload && typeof body.payload === "object") ? body.payload : {};
  const draft = await saveFlowDraft(db, locals.owner.id, payload, flowType);

  return new Response(JSON.stringify({ draft, saved: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
