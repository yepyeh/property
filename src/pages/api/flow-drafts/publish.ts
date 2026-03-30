import type { APIRoute } from "astro";
import { getFlowDraft, mapDraftToListingInput, publishDraftListing } from "../../../lib/flow-drafts";
import { getDB } from "../../../lib/runtime";
import { ValidationError } from "../../../lib/validation";

function requireField(value: string, field: string) {
  if (!value.trim()) throw new ValidationError(field, `${field} is required`);
}

function validateDraftForPublish(draft: ReturnType<typeof mapDraftToListingInput>) {
  requireField(draft.title, "title");
  requireField(draft.country, "country");
  requireField(draft.city, "city");
  requireField(draft.district, "district");
  requireField(draft.ward, "ward");
  requireField(draft.priceLabel, "priceLabel");
  requireField(draft.summary, "summary");
  requireField(draft.description, "description");
  requireField(draft.ownerName, "ownerName");
  requireField(draft.ownerEmail, "ownerEmail");
  requireField(draft.ownerPhone, "ownerPhone");
  if (!Number.isFinite(draft.numericPrice) || draft.numericPrice <= 0) {
    throw new ValidationError("numericPrice", "numericPrice must be greater than zero");
  }
}

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
  const flowType = body?.flowType ? String(body.flowType) : "listing_publish";
  const draft = body?.payload && typeof body.payload === "object"
    ? body.payload
    : await getFlowDraft(db, locals.owner.id, flowType);

  try {
    const listingInput = mapDraftToListingInput(draft, locals.owner.id);
    validateDraftForPublish(listingInput);
    const slug = await publishDraftListing(db, locals.owner.id, draft);

    return new Response(JSON.stringify({ slug, redirectTo: `/submit-listing?created=${slug}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message, field: error.field }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    throw error;
  }
};
