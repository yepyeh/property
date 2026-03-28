import type { APIRoute } from "astro";
import { authenticateOwner, buildSessionCookie, createSession, ensureBootstrapAdmin, getDefaultRedirectForRole } from "../../../lib/auth";
import { sanitizeInternalRedirect } from "../../../lib/http";

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const redirectTo = sanitizeInternalRedirect(String(form.get("redirect") || ""), "");
  await ensureBootstrapAdmin(locals.runtime);
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
      Location: sanitizeInternalRedirect(redirectTo, getDefaultRedirectForRole(owner.role)),
      "Set-Cookie": buildSessionCookie(token),
    },
  });
};
