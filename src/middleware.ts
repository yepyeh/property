import { defineMiddleware } from "astro:middleware";
import { AUTH_COOKIE, getOwnerFromSession } from "./lib/auth";

const protectedPrefixes = ["/owner", "/buyer", "/admin", "/account", "/submit-listing", "/api/admin", "/api/account", "/api/owner", "/api/listings", "/api/upload-image", "/api/billing/checkout", "/api/saved-searches", "/api/saved-listings"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const session = context.cookies.get(AUTH_COOKIE)?.value;
  const owner = await getOwnerFromSession(context.locals.runtime, session);

  context.locals.owner = owner;
  let response: Response;

  if (isProtected) {
    if (!owner) {
      const redirectTarget = encodeURIComponent(`${pathname}${search}`);
      response = context.redirect(`/login?redirect=${redirectTarget}`);
    } else {
      const isOwnerOnly = pathname.startsWith("/owner") || pathname.startsWith("/submit-listing") || pathname.startsWith("/api/owner") || pathname.startsWith("/api/listings") || pathname.startsWith("/api/upload-image") || pathname.startsWith("/api/billing/checkout");
      const isBuyerOnly = pathname.startsWith("/buyer");
      const isAdminOnly = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

      if (isAdminOnly && owner.role !== "admin") {
        response = context.redirect(owner.role === "buyer" ? "/buyer/dashboard/" : "/owner/dashboard/");
      } else if (isOwnerOnly && !["owner", "admin"].includes(owner.role)) {
        response = context.redirect("/buyer/dashboard/");
      } else if (isBuyerOnly && !["buyer", "admin"].includes(owner.role)) {
        response = context.redirect("/owner/dashboard/");
      } else {
        response = await next();
      }
    }
  } else {
    response = await next();
  }

  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Surrogate-Control", "no-store");
  return response;
});
