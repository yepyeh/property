import type { APIRoute } from "astro";
import { authenticateOwner, buildSessionCookie, createSession } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const redirectTo = String(form.get("redirect") || "/owner/dashboard/");
  const owner = await authenticateOwner(locals.runtime, email, password);

  if (!owner) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `/login?error=1&redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
  }

  const token = await createSession(locals.runtime, owner.id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectTo,
      "Set-Cookie": buildSessionCookie(token),
    },
  });
};
