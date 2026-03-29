import type { APIRoute } from "astro";
import { sanitizeInternalRedirect } from "../../../lib/http";
import { getDB } from "../../../lib/runtime";
import { createListingReport } from "../../../lib/trust";
import { ValidationError, readOptionalText, readText } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  if (!db) return new Response("D1 database binding missing", { status: 500 });

  try {
    const form = await request.formData();
    const listingSlug = readText(form, "listingSlug", { required: true, maxLength: 120 });
    const redirectTo = sanitizeInternalRedirect(String(form.get("redirectTo") || ""), `/listings/${listingSlug}/`);

    await createListingReport(db, {
      listingSlug,
      reporterUserId: locals.owner?.id ?? null,
      reporterName: readOptionalText(form, "reporterName", { maxLength: 120 }),
      reporterContact: readOptionalText(form, "reporterContact", { maxLength: 160 }),
      reason: readText(form, "reason", { required: true, maxLength: 80 }),
      details: readOptionalText(form, "details", { maxLength: 1000 }),
    });

    return new Response(null, {
      status: 303,
      headers: {
        Location: `${redirectTo}${redirectTo.includes("?") ? "&" : "?"}report=sent`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
