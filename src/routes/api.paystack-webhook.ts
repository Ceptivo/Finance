import { createFileRoute } from "@tanstack/react-router";
import {
  verifyPaystackSignature,
  activatePremium,
  serviceClient,
  PREMIUM_PRICE_CENTS,
} from "@/lib/premium.server";

// Paystack webhook — keeps recurring subscriptions alive month to month.
// Register the URL in dashboard.paystack.com → Settings → Webhooks:
//   https://<your-domain>/api/paystack-webhook
// Every event is HMAC-verified against PAYSTACK_SECRET_KEY before any write.

export const Route = createFileRoute("/api/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const ok = await verifyPaystackSignature(raw, request.headers.get("x-paystack-signature"));
        if (!ok) return new Response("invalid signature", { status: 401 });

        let event: any;
        try {
          event = JSON.parse(raw);
        } catch {
          return new Response("bad payload", { status: 400 });
        }

        try {
          if (event.event === "charge.success") {
            const data = event.data ?? {};
            const userId = data.metadata?.user_id;
            if (
              userId &&
              data.currency === "ZAR" &&
              (Number(data.amount) || 0) >= PREMIUM_PRICE_CENTS
            ) {
              await activatePremium({
                userId,
                periodEnd: new Date(Date.now() + 31 * 86400_000),
                providerRef: data.customer?.customer_code ?? null,
                reference: data.reference ?? null,
              });
            }
          } else if (
            event.event === "subscription.disable" ||
            event.event === "subscription.not_renew"
          ) {
            const customerCode = event.data?.customer?.customer_code;
            if (customerCode) {
              const svc = serviceClient();
              await svc
                .from("app_subscriptions")
                .update({ status: "cancelled" })
                .eq("provider_ref", customerCode);
            }
          }
        } catch (e) {
          console.error("[paystack-webhook]", e);
          return new Response("error", { status: 500 });
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
