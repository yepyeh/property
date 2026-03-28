import type { APIRoute } from "astro";
import { getWebhookSecret, verifyStripeSignature } from "../../../lib/billing";
import { getDB, recordPayment, updateListingPlan } from "../../../lib/marketplace";

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
        id?: string;
        payment_intent?: string | null;
        customer_details?: {
          email?: string | null;
        };
        metadata?: Record<string, string>;
        amount_total?: number;
        currency?: string;
        payment_status?: string;
      };
    };
  };

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const metadata = session?.metadata ?? {};
    const listingSlug = metadata.listingSlug || "";
    const planType = metadata.planType === "promoted" ? "promoted" : metadata.planType === "paid" ? "paid" : null;
    const days = Number(metadata.days || 0);

    if (listingSlug && planType) {
      await recordPayment(db, {
        stripeSessionId: session?.id || crypto.randomUUID(),
        stripePaymentIntentId: session?.payment_intent ?? null,
        listingSlug,
        ownerUserId: Number(metadata.ownerUserId || 0) || null,
        ownerEmail: session?.customer_details?.email ?? null,
        planType,
        amount: session?.amount_total ?? 0,
        currency: session?.currency ?? "vnd",
        status: session?.payment_status ?? "paid",
        paidAt: new Date().toISOString(),
      });

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
