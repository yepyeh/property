import type { APIRoute } from "astro";
import { AUTH_COOKIE, clearSessionCookie, destroySession } from "../../../lib/auth";

export const POST: APIRoute = async ({ cookies, locals }) => {
  await destroySession(locals.runtime, cookies.get(AUTH_COOKIE)?.value);

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/login",
      "Set-Cookie": clearSessionCookie(),
    },
  });
};
