import type { APIRoute } from "astro";
import { generatePropertyNarrativeDraft } from "../../../lib/listing-copy";

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.owner || !["owner", "admin"].includes(locals.owner.role)) {
    return new Response(JSON.stringify({ error: "Owner account required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const uniqueSellingPoints = String(payload.uniqueSellingPoints || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const trustSignals = String(payload.trustSignals || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const draft = generatePropertyNarrativeDraft({
    title: String(payload.title || ""),
    propertyType: String(payload.propertyType || ""),
    location: {
      country: String(payload.country || ""),
      city: String(payload.city || ""),
      district: String(payload.district || ""),
      ward: String(payload.ward || ""),
    },
    area: Number(payload.area) || undefined,
    beds: Number(payload.beds) || undefined,
    baths: Number(payload.baths) || undefined,
    summary: String(payload.summary || ""),
    neighborhoodHeadline: String(payload.neighborhoodHeadline || ""),
    commuteNotes: String(payload.commuteNotes || ""),
    uniqueSellingPoints,
    trustSignals,
  });

  return new Response(JSON.stringify(draft), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
