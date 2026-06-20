import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SA_TFSA_ANNUAL_LIMIT = 36000;
const SA_TFSA_LIFETIME_LIMIT = 500000;

export const getTFSASummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles" as never)
      .select("current_tfsa_contribution")
      .eq("id", userId)
      .single();

    const used = Number((profile as any)?.current_tfsa_contribution || 0);
    const remaining = Math.max(0, SA_TFSA_ANNUAL_LIMIT - used);
    const percentUsed = (used / SA_TFSA_ANNUAL_LIMIT) * 100;

    return {
      used,
      remaining,
      percentUsed,
      limit: SA_TFSA_ANNUAL_LIMIT,
      isOverLimit: used > SA_TFSA_ANNUAL_LIMIT,
      penaltyRisk: used > SA_TFSA_ANNUAL_LIMIT ? (used - SA_TFSA_ANNUAL_LIMIT) * 0.4 : 0,
    };
  });

export const updateTFSAContribution = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ amount: z.number().min(0) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles" as never)
      .update({ current_tfsa_contribution: data.amount } as never)
      .eq("id", userId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
