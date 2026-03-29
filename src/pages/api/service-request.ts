import { getDB } from "../../lib/runtime";
import { createConciergeRequest } from "../../lib/service";

function readOptionalText(form: FormData, key: string, maxLength = 400) {
  const value = form.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function readRequiredText(form: FormData, key: string, maxLength = 400) {
  const value = readOptionalText(form, key, maxLength);
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}

export const POST = async ({ request, locals, redirect }: any) => {
  try {
    const form = await request.formData();
    const db = getDB(locals.runtime);

    await createConciergeRequest(db, {
      requesterUserId: locals.owner?.id ?? null,
      name: readRequiredText(form, "name", 120),
      email: readRequiredText(form, "email", 160),
      phone: readOptionalText(form, "phone", 80),
      role: readRequiredText(form, "role", 40),
      requestType: readRequiredText(form, "requestType", 80),
      marketIntent: readOptionalText(form, "marketIntent", 40),
      city: readOptionalText(form, "city", 120),
      budgetLabel: readOptionalText(form, "budgetLabel", 120),
      timelineLabel: readOptionalText(form, "timelineLabel", 120),
      message: readRequiredText(form, "message", 2000),
    });

    return redirect("/concierge?sent=1");
  } catch {
    return redirect("/concierge?error=1");
  }
};
