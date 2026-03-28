import { defineMiddleware } from "astro:middleware";
import { AUTH_COOKIE, isAuthenticated } from "./lib/auth";

const protectedPrefixes = ["/owner", "/submit-listing", "/api/listings"];

export const onRequest = defineMiddleware((context, next) => {
  const { pathname, search } = context.url;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) return next();

  const session = context.cookies.get(AUTH_COOKIE)?.value;
  if (isAuthenticated(context.locals.runtime, session)) {
    return next();
  }

  const redirectTarget = encodeURIComponent(`${pathname}${search}`);
  return context.redirect(`/login?redirect=${redirectTarget}`);
});
