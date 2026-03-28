import type { APIRoute } from "astro";
import { buildSessionCookie, getAuthConfig } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const redirectTo = String(form.get("redirect") || "/owner/dashboard/");
  const auth = getAuthConfig(locals.runtime);

  if (email !== auth.email || password !== auth.password || !auth.sessionToken) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `/login?error=1&redirect=${encodeURIComponent(redirectTo)}`,
      },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: redirectTo,
      "Set-Cookie": buildSessionCookie(auth.sessionToken),
    },
  });
};
