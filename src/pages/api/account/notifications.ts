import type { APIRoute } from "astro";
import { updateNotificationPreferences } from "../../../lib/notifications";
import { getDB } from "../../../lib/runtime";
import { readBoolean, readEnum } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) return new Response("D1 database binding missing", { status: 500 });
  if (!owner) return new Response("Account required", { status: 403 });

  const form = await request.formData();
  const cadence = readEnum(form, "cadence", ["daily", "weekly"], "daily");

  await updateNotificationPreferences(db, owner.id, {
    emailEnabled: readBoolean(form, "emailEnabled"),
    inAppEnabled: readBoolean(form, "inAppEnabled"),
    cadence,
    listingExpiry: readBoolean(form, "listingExpiry"),
    enquiryActivity: readBoolean(form, "enquiryActivity"),
    billingEvents: readBoolean(form, "billingEvents"),
    savedSearchMatches: readBoolean(form, "savedSearchMatches"),
    savedListingUpdates: readBoolean(form, "savedListingUpdates"),
  });

  return new Response(null, {
    status: 303,
    headers: {
      Location: "/account/notifications?updated=1",
    },
  });
};
