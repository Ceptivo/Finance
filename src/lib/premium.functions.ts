import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  getPremiumStatus,
  premiumEnforced,
  activatePremium,
  paystackFetch,
  PREMIUM_PRICE_ZAR,
  PREMIUM_PRICE_CENTS,
} from "./premium.server";

export const getMyPremium = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = typeof (claims as any)?.email === "string" ? (claims as any).email : null;
    const status = await getPremiumStatus(supabase, userId, email);
    return {
      ...status,
      enforced: premiumEnforced(),
      configured: !!process.env.PAYSTACK_SECRET_KEY,
      priceZar: PREMIUM_PRICE_ZAR,
    };
  });

/** Start a Paystack checkout. Returns the hosted payment page URL. */
export const startPremiumCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ origin: z.string().url().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { claims, userId } = context;
    const email = typeof (claims as any)?.email === "string" ? (claims as any).email : null;
    if (!email) throw new Error("Your account has no email address — cannot start checkout.");

    const payload: Record<string, unknown> = {
      email,
      amount: PREMIUM_PRICE_CENTS,
      currency: "ZAR",
      callback_url: `${data.origin}/premium`,
      metadata: { user_id: userId, product: "finance-hub-premium" },
    };
    // With a Paystack Plan configured, the charge creates a real recurring
    // subscription (auto-renews monthly). Without it, it's a one-time payment
    // that grants 31 days.
    if (process.env.PAYSTACK_PLAN_CODE) payload.plan = process.env.PAYSTACK_PLAN_CODE;

    const tx = await paystackFetch<{ authorization_url: string; reference: string }>(
      "/transaction/initialize",
      { method: "POST", body: JSON.stringify(payload) },
    );
    return { url: tx.authorization_url, reference: tx.reference };
  });

/** Verify a returned checkout reference and activate premium. */
export const confirmPremium = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ reference: z.string().min(4).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;

    const tx = await paystackFetch<{
      status: string;
      amount: number;
      currency: string;
      customer?: { customer_code?: string };
      metadata?: { user_id?: string };
    }>(`/transaction/verify/${encodeURIComponent(data.reference)}`);

    if (tx.status !== "success") throw new Error(`Payment not completed (status: ${tx.status}).`);
    if (tx.currency !== "ZAR" || tx.amount < PREMIUM_PRICE_CENTS) {
      throw new Error("Payment amount mismatch — contact support.");
    }
    if (tx.metadata?.user_id && tx.metadata.user_id !== userId) {
      throw new Error("This payment belongs to a different account.");
    }

    const periodEnd = new Date(Date.now() + 31 * 86400_000);
    await activatePremium({
      userId,
      periodEnd,
      providerRef: tx.customer?.customer_code ?? null,
      reference: data.reference,
    });
    return { ok: true, periodEnd: periodEnd.toISOString() };
  });
