interface RuntimeLike {
  env?: {
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
  };
}

export type BillingPlanType = "paid" | "promoted";

export interface BillingProduct {
  planType: BillingPlanType;
  label: string;
  description: string;
  amount: number;
  currency: string;
  days: number;
}

export const BILLING_PRODUCTS: Record<BillingPlanType, BillingProduct> = {
  paid: {
    planType: "paid",
    label: "Standard Listing",
    description: "Keep this listing live for 30 days.",
    amount: 499000,
    currency: "vnd",
    days: 30,
  },
  promoted: {
    planType: "promoted",
    label: "Promoted Listing",
    description: "Boost this listing to the top tier for 7 days.",
    amount: 199000,
    currency: "vnd",
    days: 7,
  },
};

export function isBillingEnabled(runtime?: RuntimeLike | null) {
  return Boolean(runtime?.env?.STRIPE_SECRET_KEY);
}

export function getWebhookSecret(runtime?: RuntimeLike | null) {
  return runtime?.env?.STRIPE_WEBHOOK_SECRET ?? "";
}

export async function createCheckoutSession(
  runtime: RuntimeLike | null | undefined,
  input: {
    appUrl: string;
    listingSlug: string;
    listingTitle: string;
    ownerUserId: number;
    planType: BillingPlanType;
  }
) {
  const secretKey = runtime?.env?.STRIPE_SECRET_KEY;
  const product = BILLING_PRODUCTS[input.planType];

  if (!secretKey || !product) {
    return { ok: false as const, error: "missing_config" };
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("success_url", `${input.appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`);
  body.set("cancel_url", `${input.appUrl}/billing/cancel`);
  body.set("metadata[listingSlug]", input.listingSlug);
  body.set("metadata[ownerUserId]", String(input.ownerUserId));
  body.set("metadata[planType]", input.planType);
  body.set("metadata[days]", String(product.days));
  body.set("payment_intent_data[metadata][listingSlug]", input.listingSlug);
  body.set("payment_intent_data[metadata][ownerUserId]", String(input.ownerUserId));
  body.set("payment_intent_data[metadata][planType]", input.planType);
  body.set("payment_intent_data[metadata][days]", String(product.days));
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", product.currency);
  body.set("line_items[0][price_data][unit_amount]", String(product.amount));
  body.set("line_items[0][price_data][product_data][name]", `${product.label}: ${input.listingTitle}`);
  body.set("line_items[0][price_data][product_data][description]", product.description);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    return {
      ok: false as const,
      error: "stripe_error",
      detail: await response.text(),
    };
  }

  const session = await response.json<{ url?: string }>();

  if (!session.url) {
    return { ok: false as const, error: "missing_url" };
  }

  return { ok: true as const, url: session.url };
}

function hexToBytes(hex: string) {
  const pairs = hex.match(/.{1,2}/g) ?? [];
  return new Uint8Array(pairs.map((pair) => Number.parseInt(pair, 16)));
}

async function computeSignature(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return new Uint8Array(signature);
}

function secureCompare(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left[index] ^ right[index];
  }

  return mismatch === 0;
}

export async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  if (!signatureHeader || !secret) return false;

  const parts = signatureHeader.split(",").map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = await computeSignature(secret, `${timestamp}.${payload}`);
  return signatures.some((signature) => secureCompare(expected, hexToBytes(signature)));
}
