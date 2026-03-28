import type { APIRoute } from "astro";
import { sendPendingExpiryNotificationEmails } from "../../../../lib/notifications";

export const POST: APIRoute = async ({ locals, request }) => {
  const owner = locals.owner;

  if (!owner || owner.role !== "admin") {
    return new Response("Admin account required", { status: 403 });
  }

  const result = await sendPendingExpiryNotificationEmails(locals.runtime, {
    appUrl: new URL(request.url).origin,
  });
  const redirectBase = "/admin/billing/";

  if (!result.ok) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${redirectBase}?emailError=${encodeURIComponent(result.error)}`,
      },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: `${redirectBase}?emailed=${result.sent}&skipped=${result.skipped}&failed=${result.failed}`,
    },
  });
};
