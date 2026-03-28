import type { APIRoute } from "astro";
import { createEnquiry } from "../../lib/listings";
import { getDB } from "../../lib/runtime";
import { ValidationError, readOptionalText, readText } from "../../lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  if (!db) {
    return new Response("D1 database binding missing", { status: 500 });
  }

  try {
    const form = await request.formData();
    const listingSlug = readText(form, "listingSlug", { required: true, maxLength: 120 });

    await createEnquiry(db, {
      listingSlug,
      listingTitle: readText(form, "listingTitle", { required: true, maxLength: 160 }),
      applicantName: readText(form, "applicantName", { required: true, maxLength: 120 }),
      contact: readText(form, "contact", { required: true, maxLength: 160 }),
      message: readText(form, "message", { required: true, maxLength: 2000 }),
      preferredTime: readOptionalText(form, "preferredTime", { maxLength: 120 }),
    });

    return new Response(null, {
      status: 303,
      headers: {
        Location: `/listings/${listingSlug}/?enquiry=sent`,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
