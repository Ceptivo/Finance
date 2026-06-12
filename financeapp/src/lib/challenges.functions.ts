import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────────
   Smart Money Challenge — Server Functions
   All DB operations go through service_role where writes are needed.
   Users can only read/write their own rows (enforced by RLS + userId check).
───────────────────────────────────────────────────────────────────────────── */

/* ── Get active challenge + its stats ─────────────────────────────────────── */
export const getActiveChallenge = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data: challenge } = await supabase
      .from("smart_money_challenges" as never)
      .select("*")
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challenge) return { challenge: null, stats: null };

    // participant counts
    const { data: stats } = await supabase
      .from("challenge_participants" as never)
      .select("payment_status, completed, qualified")
      .eq("challenge_id", (challenge as any).id);

    const participants = stats ?? [];
    const paid = participants.filter((p: any) => p.payment_status === "paid").length;
    const completed = participants.filter((p: any) => p.completed).length;
    const qualified = participants.filter((p: any) => p.qualified).length;
    const cap = (challenge as any).monthly_cap ?? 500;

    return {
      challenge,
      stats: {
        paid,
        completed,
        qualified,
        cap,
        cap_reached: paid >= cap,
        spots_remaining: Math.max(0, cap - paid),
      },
    };
  });

/* ── Get current user's status for the active challenge ──────────────────── */
export const getUserChallengeStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // find active challenge
    const { data: challenge } = await supabase
      .from("smart_money_challenges" as never)
      .select("id")
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (!challenge) return { status: "no_challenge" as const, participant: null };

    const { data: participant } = await supabase
      .from("challenge_participants" as never)
      .select("*")
      .eq("challenge_id", (challenge as any).id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!participant) return { status: "not_joined" as const, participant: null };

    const p = participant as any;
    if (p.payment_status !== "paid") return { status: "payment_pending" as const, participant: p };
    if (p.qualified) return { status: "qualified" as const, participant: p };
    if (p.completed) return { status: "completed" as const, participant: p };
    return { status: "joined" as const, participant: p };
  });

/* ── Join challenge (creates pending participant, payment handled client-side) */
export const joinChallenge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check challenge is still active + cap not reached
    const { data: challenge } = await supabase
      .from("smart_money_challenges" as never)
      .select("*")
      .eq("id", data.challenge_id)
      .eq("status", "active")
      .maybeSingle();

    if (!challenge) throw new Error("Challenge not found or not active.");

    const { data: countData } = await supabase
      .from("challenge_participants" as never)
      .select("id", { count: "exact" })
      .eq("challenge_id", data.challenge_id)
      .eq("payment_status", "paid");

    const paidCount = (countData as any)?.length ?? 0;
    if (paidCount >= (challenge as any).monthly_cap) {
      throw new Error("Monthly cap reached — challenge is full.");
    }

    // Prevent duplicate entry
    const { data: existing } = await supabase
      .from("challenge_participants" as never)
      .select("id")
      .eq("challenge_id", data.challenge_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) throw new Error("You have already joined this challenge.");

    // Create pending participant row
    const { data: participant, error } = await supabase
      .from("challenge_participants" as never)
      .insert({
        challenge_id: data.challenge_id,
        user_id: userId,
        payment_status: "pending",
      } as never)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { participant };
  });

/* ── Simulate payment confirmation (replace with real webhook in production) */
export const confirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ participant_id: z.string().uuid(), provider_ref: z.string().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { error } = await supabase
      .from("challenge_participants" as never)
      .update({ payment_status: "paid" } as never)
      .eq("id", data.participant_id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ── Confirm challenge completion (honour system) ────────────────────────── */
export const confirmCompletion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Must have paid to qualify
    const { data: participant } = await supabase
      .from("challenge_participants" as never)
      .select("*")
      .eq("challenge_id", data.challenge_id)
      .eq("user_id", userId)
      .eq("payment_status", "paid")
      .maybeSingle();

    if (!participant) throw new Error("You must pay the entry fee before confirming completion.");

    const now = new Date().toISOString();
    const { error } = await supabase
      .from("challenge_participants" as never)
      .update({
        completed: true,
        completed_at: now,
        qualified: true,
      } as never)
      .eq("id", (participant as any).id)
      .eq("user_id", userId);

    if (error) throw new Error(error.message);
    return { ok: true, qualified: true };
  });

/* ── Get published winners ───────────────────────────────────────────────── */
export const getPublishedWinners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;

    const { data } = await supabase
      .from("smart_money_winners" as never)
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(20);

    return { winners: (data ?? []) as any[] };
  });

/* ── Join cap waitlist ───────────────────────────────────────────────────── */
export const joinWaitlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ challenge_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    await supabase
      .from("smart_money_waitlist" as never)
      .upsert({ challenge_id: data.challenge_id, user_id: userId } as never);

    return { ok: true };
  });
