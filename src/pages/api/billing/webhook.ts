import type { APIRoute } from "astro";
import { getWebhookSecret, verifyStripeSignature } from "../../../lib/billing";
import { getDB, updateListingPlan } from "../../../lib/marketplace";

export const POST: APIRoute = async ({ request, locals }) => {
  const db = getDB(locals.runtime);
  const webhookSecret = getWebhookSecret(locals.runtime);
  const signatureHeader = request.headers.get("stripe-signature") || "";
  const payload = await request.text();

  if (!db || !webhookSecret) {
    return new Response("Webhook not configured", { status: 503 });
  }

  const verified = await verifyStripeSignature(payload, signatureHeader, webhookSecret);
  if (!verified) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(payload) as {
    type?: string;
    data?: {
      object?: {
        metadata?: Record<string, string>;
      };
    };
  };

  if (event.type === "checkout.session.completed") {
    const metadata = event.data?.object?.metadata ?? {};
    const listingSlug = metadata.listingSlug || "";
    const planType = metadata.planType === "promoted" ? "promoted" : metadata.planType === "paid" ? "paid" : null;
    const days = Number(metadata.days || 0);

    if (listingSlug && planType) {
      await updateListingPlan(db, null, true, {
        listingSlug,
        planType,
        paidDays: planType === "paid" ? days : undefined,
        promotedDays: planType === "promoted" ? days : undefined,
      });
    }
  }

  return new Response("ok", { status: 200 });
};
