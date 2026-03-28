import type { APIRoute } from "astro";
import { getDB, updateNotificationPreferences } from "../../../lib/marketplace";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Account required", { status: 403 });

  const form = await request.formData();
  const cadence = String(form.get("cadence") || "daily") === "weekly" ? "weekly" : "daily";

  await updateNotificationPreferences(db, owner.id, {
    emailEnabled: form.has("emailEnabled"),
    inAppEnabled: form.has("inAppEnabled"),
    cadence,
    listingExpiry: form.has("listingExpiry"),
    enquiryActivity: form.has("enquiryActivity"),
    billingEvents: form.has("billingEvents"),
    savedSearchMatches: form.has("savedSearchMatches"),
    savedListingUpdates: form.has("savedListingUpdates"),
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/account/notifications?updated=1",
    },
  });
};
