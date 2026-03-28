import type { APIRoute } from "astro";
import { authenticateOwner, buildSessionCookie, createOwnerAccount, createSession, ensureBootstrapAdmin, getDefaultRedirectForRole } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData();
  const fullName = String(form.get("fullName") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const password = String(form.get("password") || "");
  const role = String(form.get("role") || "owner") === "buyer" ? "buyer" : "owner";
  const signupPath = role === "buyer" ? "/signup?role=buyer" : "/signup?role=owner";

  if (!fullName || !email || password.length < 8) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${signupPath}&error=1`,
      },
    });
  }

  await ensureBootstrapAdmin(locals.runtime);
  const result = await createOwnerAccount(locals.runtime, { fullName, email, phone, password, role });

  if (!result.ok) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${signupPath}&exists=1`,
      },
    });
  }

  const owner = await authenticateOwner(locals.runtime, email, password);
  if (!owner) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/login",
      },
    });
  }

  const token = await createSession(locals.runtime, owner.id);

  return new Response(null, {
    status: 303,
    headers: {
      Location: getDefaultRedirectForRole(owner.role),
      "Set-Cookie": buildSessionCookie(token),
    },
  });
};
