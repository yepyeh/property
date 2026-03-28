import type { APIRoute } from "astro";
import { createListing, getDB } from "../../lib/marketplace";

function parseCommaSeparatedList(value: FormDataEntryValue | null) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  if (!db) {
    return new Response("D1 database binding missing", { status: 500 });
  }
  if (!locals.owner) {
    return new Response("Owner account required", { status: 403 });
  }

  const form = await request.formData();
  const slug = await createListing(db, {
    title: String(form.get("title") || ""),
    city: String(form.get("city") || ""),
    district: String(form.get("district") || ""),
    ward: String(form.get("ward") || ""),
    propertyType: String(form.get("propertyType") || "Condo"),
    intent: String(form.get("intent") || "buy"),
    priceLabel: String(form.get("priceLabel") || ""),
    numericPrice: Number(form.get("numericPrice") || 0),
    priceUnit: String(form.get("priceUnit") || "VND"),
    beds: Number(form.get("beds") || 0),
    baths: Number(form.get("baths") || 0),
    area: Number(form.get("area") || 0),
    summary: String(form.get("summary") || ""),
    description: String(form.get("description") || ""),
    neighborhoodHeadline: String(form.get("neighborhoodHeadline") || ""),
    commuteNotes: String(form.get("commuteNotes") || ""),
    nearbyPlaces: parseCommaSeparatedList(form.get("nearbyPlaces")),
    trustSignals: parseCommaSeparatedList(form.get("trustSignals")),
    lat: Number(form.get("lat") || "") || null,
    lng: Number(form.get("lng") || "") || null,
    locationPrecisionLabel: String(form.get("locationPrecisionLabel") || ""),
    ownerName: String(form.get("ownerName") || ""),
    ownerEmail: String(form.get("ownerEmail") || ""),
    ownerPhone: String(form.get("ownerPhone") || ""),
    ownerUserId: locals.owner.id,
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: `/submit-listing?created=${slug}`,
    },
  });
};
