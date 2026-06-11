import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiPrompt, parseJsonReply } from "./ai.server";

const CoachingSchema = z.object({
  overall_grade: z.string().default("B"),
  summary: z.string().default(""),
  potential_monthly_savings: z.number().default(0),
  potential_yearly_savings: z.number().default(0),
  top_wins: z.array(z.string()).default([]),
  top_mistakes: z.array(z.string()).default([]),
  cut_back: z.array(z.object({
    category: z.string(),
    current: z.number(),
    suggested: z.number(),
    saves: z.number(),
    why: z.string(),
  })).default([]),
  subscription_audit: z.array(z.object({
    name: z.string(),
    verdict: z.enum(["keep","review","cancel"]),
    reason: z.string(),
  })).default([]),
  behavior_patterns: z.array(z.string()).default([]),
  action_plan: z.array(z.string()).default([]),
  pep_talk: z.string().default(""),
});

export type CoachingReport = z.infer<typeof CoachingSchema>;

export const generateCoachingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("past_statements" as never)
      .select("*")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);
    const s = row as any;

    const parsed = s.parsed ?? {};
    const cur = s.currency ?? "USD";
    const ctx = {
      currency: cur,
      period: `${s.period_start ?? "?"} → ${s.period_end ?? "?"}`,
      total_income: Number(s.total_income) || 0,
      total_expense: Number(s.total_expense) || 0,
      net: Number(s.net) || 0,
      transactions: (parsed.transactions ?? []).slice(0, 300),
      subscriptions: parsed.subscriptions ?? [],
      accounts: parsed.accounts ?? [],
    };

    const prompt = `You are a friendly, blunt personal finance coach. Analyze this bank statement and produce a JSON coaching report.

CONTEXT (currency ${cur}):
${JSON.stringify(ctx)}

Return STRICT minified JSON only (no prose, no markdown fences) matching:
{
 "overall_grade": "A+|A|B+|B|C+|C|D|F",
 "summary": "2-3 sentence honest verdict",
 "potential_monthly_savings": number,    // realistic ${cur} savings/month if recommendations are followed
 "potential_yearly_savings": number,     // potential_monthly_savings * 12
 "top_wins": ["..."],                    // 2-4 things they did well
 "top_mistakes": ["..."],                // 3-5 specific issues with amounts where possible
 "cut_back": [
   { "category": "Food", "current": number, "suggested": number, "saves": number, "why": "..." }
 ],                                      // 3-6 categories with concrete numbers
 "subscription_audit": [
   { "name": "Netflix", "verdict": "keep|review|cancel", "reason": "..." }
 ],
 "behavior_patterns": ["..."],           // 3-5 patterns (e.g. payday splurges, weekend over-spend)
 "action_plan": ["..."],                 // 5-7 step-by-step actions for next month
 "pep_talk": "1-2 sentence motivating close"
}

Be specific with numbers, use the actual currency, no fluff.`;

    const text = await aiPrompt(prompt, undefined, undefined, userId);
    let report: CoachingReport;
    try {
      report = CoachingSchema.parse(parseJsonReply(text));
    } catch {
      throw new Error("AI returned malformed report. Try again.");
    }

    await supabase
      .from("past_statements" as never)
      .update({ coaching: report as any } as never)
      .eq("id", data.id)
      .eq("user_id", userId);

    return { report };
  });
