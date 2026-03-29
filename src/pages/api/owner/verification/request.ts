import type { APIRoute } from "astro";
import { getDB } from "../../../../lib/runtime";
import { requestOwnerVerification } from "../../../../lib/trust";
import { readOptionalText, ValidationError } from "../../../../lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner || !["owner", "admin"].includes(owner.role)) return new Response("Owner account required", { status: 403 });

  try {
    const form = await request.formData();
    const ownerNote = readOptionalText(form, "ownerNote", { maxLength: 500 });
    const result = await requestOwnerVerification(db, owner.id, ownerNote);

    return new Response(null, {
      status: 303,
      headers: {
        Location: result.ok
          ? "/owner/dashboard/?action=verification-requested"
          : "/owner/dashboard/?action=verification-pending",
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.message, { status: 400 });
    }

    throw error;
  }
};
