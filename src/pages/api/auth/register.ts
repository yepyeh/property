import type { APIRoute } from "astro";
import { authenticateOwner, buildSessionCookie, createOwnerAccount, createSession } from "../../../lib/auth";

export const POST: APIRoute = async ({ request, locals }) => {
  const form = await request.formData();
  const fullName = String(form.get("fullName") || "").trim();
  const email = String(form.get("email") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const password = String(form.get("password") || "");

  if (!fullName || !email || password.length < 8) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/signup?error=1",
      },
    });
  }

  const result = await createOwnerAccount(locals.runtime, { fullName, email, phone, password });

  if (!result.ok) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: "/signup?exists=1",
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
      Location: "/owner/dashboard/",
      "Set-Cookie": buildSessionCookie(token),
    },
  });
};
