import { defineMiddleware } from "astro:middleware";
import { AUTH_COOKIE, getOwnerFromSession } from "./lib/auth";

const protectedPrefixes = ["/owner", "/admin", "/submit-listing", "/api/admin", "/api/listings", "/api/upload-image", "/api/billing/checkout", "/api/saved-searches"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const session = context.cookies.get(AUTH_COOKIE)?.value;
  const owner = await getOwnerFromSession(context.locals.runtime, session);

  context.locals.owner = owner;

  if (!isProtected) return next();

  if (owner) {
    return next();
  }

  const redirectTarget = encodeURIComponent(`${pathname}${search}`);
  return context.redirect(`/login?redirect=${redirectTarget}`);
});
