import type { APIRoute } from "astro";
import { authenticateOwner, buildSessionCookie, createSession, getDefaultRedirectForRole } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const redirectTo = String(form.get("redirect") || "");
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
      Location: redirectTo || getDefaultRedirectForRole(owner.role),
      "Set-Cookie": buildSessionCookie(token),
    },
  });
};
