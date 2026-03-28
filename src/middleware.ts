import { defineMiddleware } from "astro:middleware";
import { AUTH_COOKIE, getOwnerFromSession } from "./lib/auth";

const protectedPrefixes = ["/owner", "/buyer", "/admin", "/account", "/submit-listing", "/api/admin", "/api/account", "/api/listings", "/api/upload-image", "/api/billing/checkout", "/api/saved-searches", "/api/saved-listings"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname, search } = context.url;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  const session = context.cookies.get(AUTH_COOKIE)?.value;
  const owner = await getOwnerFromSession(context.locals.runtime, session);

  context.locals.owner = owner;

  if (!isProtected) return next();

  if (!owner) {
    const redirectTarget = encodeURIComponent(`${pathname}${search}`);
    return context.redirect(`/login?redirect=${redirectTarget}`);
  }

  const isOwnerOnly = pathname.startsWith("/owner") || pathname.startsWith("/submit-listing") || pathname.startsWith("/api/listings") || pathname.startsWith("/api/upload-image") || pathname.startsWith("/api/billing/checkout");
  const isBuyerOnly = pathname.startsWith("/buyer");
  const isAdminOnly = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");

  if (isAdminOnly && owner.role !== "admin") {
    return context.redirect(owner.role === "buyer" ? "/buyer/dashboard/" : "/owner/dashboard/");
  }

  if (isOwnerOnly && !["owner", "admin"].includes(owner.role)) {
    return context.redirect("/buyer/dashboard/");
  }

  if (isBuyerOnly && !["buyer", "admin"].includes(owner.role)) {
    return context.redirect("/owner/dashboard/");
  }

  return next();
});
