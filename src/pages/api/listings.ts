import type { APIRoute } from "astro";
import { createListing, getDB } from "../../lib/marketplace";
import { ValidationError, readEnum, readNumber, readOptionalText, readText } from "../../lib/validation";

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

  try {
    const form = await request.formData();
    const slug = await createListing(db, {
      title: readText(form, "title", { required: true, maxLength: 160 }),
      city: readText(form, "city", { required: true, maxLength: 120 }),
      district: readText(form, "district", { required: true, maxLength: 120 }),
      ward: readText(form, "ward", { required: true, maxLength: 120 }),
      propertyType: readEnum(form, "propertyType", ["Condo", "Villa", "Townhouse", "Apartment", "House", "Land"], "Condo"),
      intent: readEnum(form, "intent", ["buy", "rent"], "buy"),
      priceLabel: readText(form, "priceLabel", { required: true, maxLength: 120 }),
      numericPrice: readNumber(form, "numericPrice", { required: true, min: 0 }) ?? 0,
      priceUnit: readEnum(form, "priceUnit", ["VND", "VND / month"], "VND"),
      beds: readNumber(form, "beds", { required: true, min: 0, max: 99 }) ?? 0,
      baths: readNumber(form, "baths", { required: true, min: 0, max: 99 }) ?? 0,
      area: readNumber(form, "area", { required: true, min: 0 }) ?? 0,
      summary: readText(form, "summary", { required: true, maxLength: 400 }),
      description: readText(form, "description", { required: true, maxLength: 5000 }),
      neighborhoodHeadline: readOptionalText(form, "neighborhoodHeadline", { maxLength: 400 }),
      commuteNotes: readOptionalText(form, "commuteNotes", { maxLength: 400 }),
      nearbyPlaces: parseCommaSeparatedList(form.get("nearbyPlaces")),
      trustSignals: parseCommaSeparatedList(form.get("trustSignals")),
      lat: readNumber(form, "lat", { min: -90, max: 90 }) ?? null,
      lng: readNumber(form, "lng", { min: -180, max: 180 }) ?? null,
      locationPrecisionLabel: readOptionalText(form, "locationPrecisionLabel", { maxLength: 120 }),
      ownerName: readText(form, "ownerName", { required: true, maxLength: 120 }),
      ownerEmail: readText(form, "ownerEmail", { required: true, maxLength: 160 }),
      ownerPhone: readText(form, "ownerPhone", { required: true, maxLength: 60 }),
      ownerUserId: locals.owner.id,
    });

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/submit-listing?created=${slug}`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
