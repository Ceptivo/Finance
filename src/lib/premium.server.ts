import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/* Premium gating for AI features.
 *
 * Enforcement is ON when PAYSTACK_SECRET_KEY is set or PREMIUM_ENFORCE=true.
 * Owner emails in OWNER_EMAILS (comma-separated) always have full access, so
 * you can use your own app for free and test before payments are connected.
 */

export const PREMIUM_PRICE_ZAR = 100; // R100/month
export const PREMIUM_PRICE_CENTS = PREMIUM_PRICE_ZAR * 100; // Paystack ZAR amounts are in cents

export function premiumEnforced(): boolean {
  if (process.env.PREMIUM_ENFORCE === "false") return false;
  return process.env.PREMIUM_ENFORCE === "true" || !!process.env.PAYSTACK_SECRET_KEY;
}

export function isOwnerEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const owners = (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return owners.includes(email.toLowerCase());
}

export interface PremiumStatus {
  premium: boolean;
  reason: "owner" | "subscribed" | "not_enforced" | "none";
  periodEnd: string | null;
}

/** Read the user's premium status using their own (RLS-scoped) client. */
export async function getPremiumStatus(
  supabase: SupabaseClient,
  userId: string,
  email?: string | null,
): Promise<PremiumStatus> {
  if (isOwnerEmail(email)) return { premium: true, reason: "owner", periodEnd: null };

  const { data } = await supabase
    .from("app_subscriptions" as never)
    .select("status,current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const row = data as { status?: string; current_period_end?: string } | null;
  const activeUntil = row?.current_period_end ? new Date(row.current_period_end) : null;
  const subscribed =
    row?.status === "active" && activeUntil !== null && activeUntil.getTime() > Date.now();

  if (subscribed) {
    return { premium: true, reason: "subscribed", periodEnd: row!.current_period_end! };
  }
  if (!premiumEnforced()) return { premium: true, reason: "not_enforced", periodEnd: null };
  return { premium: false, reason: "none", periodEnd: null };
}

/** Throw unless the user may use paid AI features. Call at the top of every AI server fn. */
export async function requirePremium(
  supabase: SupabaseClient,
  userId: string,
  claims?: Record<string, unknown>,
): Promise<void> {
  const email = typeof claims?.email === "string" ? (claims.email as string) : null;
  const status = await getPremiumStatus(supabase, userId, email);
  if (!status.premium) {
    throw new Error(
      `AI features require Premium (R${PREMIUM_PRICE_ZAR}/month). Open the Premium page to subscribe.`,
    );
  }
}

/** Service-role client — bypasses RLS. Server-only; used to write subscription rows. */
export function serviceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Server is missing SUPABASE_SERVICE_ROLE_KEY — copy it from Supabase dashboard → Settings → API (service_role) into the server env.",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Mark a user premium until `periodEnd` (called only after verified payment). */
export async function activatePremium(opts: {
  userId: string;
  periodEnd: Date;
  providerRef?: string | null;
  reference?: string | null;
}) {
  const svc = serviceClient();
  const { error } = await svc.from("app_subscriptions").upsert(
    {
      user_id: opts.userId,
      status: "active",
      current_period_end: opts.periodEnd.toISOString(),
      provider: "paystack",
      provider_ref: opts.providerRef ?? null,
      last_reference: opts.reference ?? null,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

/* ---------------- Paystack API helpers ---------------- */

const PAYSTACK_BASE = "https://api.paystack.co";

export function paystackKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error(
      "Payments are not configured yet — set PAYSTACK_SECRET_KEY on the server (dashboard.paystack.com → Settings → API Keys).",
    );
  }
  return key;
}

export async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${paystackKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json()) as { status: boolean; message?: string; data?: T };
  if (!res.ok || !body.status) {
    throw new Error(body.message || `Paystack request failed (${res.status})`);
  }
  return body.data as T;
}

/** Verify the x-paystack-signature header (HMAC-SHA512 of the raw body). */
export async function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(paystackKey()),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === signature.toLowerCase();
}
