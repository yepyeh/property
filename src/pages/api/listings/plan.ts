import type { APIRoute } from "astro";
import { updateListingPlan } from "../../../lib/billing-store";
import { getDB } from "../../../lib/runtime";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const owner = locals.owner;

  if (!db) {
    return new Response("D1 database binding missing", { status: 500 });
  }

  if (!owner) {
    return new Response("Owner account required", { status: 403 });
  }

  if (owner.role !== "admin") {
    return new Response("Admin account required", { status: 403 });
  }

  const form = await request.formData();
  const listingSlug = String(form.get("listingSlug") || "");
  const planType = String(form.get("planType") || "free_trial");
  const paidDays = Number(form.get("paidDays") || 30);
  const promotedDays = Number(form.get("promotedDays") || 7);
  const redirectTo = "/admin/billing/";

  if (!listingSlug || !["free_trial", "paid", "promoted"].includes(planType)) {
    return new Response("Invalid plan update", { status: 400 });
  }

  const result = await updateListingPlan(db, owner.id, true, {
    listingSlug,
    planType: planType as "free_trial" | "paid" | "promoted",
    paidDays,
    promotedDays,
  });

  if (!result.ok) {
    return new Response(result.error, { status: result.error === "forbidden" ? 403 : 404 });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: `${redirectTo}?updated=${encodeURIComponent(listingSlug)}&action=plan-updated&planType=${encodeURIComponent(planType)}`,
    },
  });
};
