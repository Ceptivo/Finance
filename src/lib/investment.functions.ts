import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiText, aiPrompt, parseJsonReply } from "./ai.server";

const ProfileSchema = z.object({
  age: z.number().int().min(10).max(120).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  currency: z.string().max(8).nullable().optional(),
  monthly_income: z.number().min(0).default(0),
  monthly_expenses: z.number().min(0).default(0),
  monthly_savings: z.number().min(0).default(0),
  monthly_savings_goal: z.number().min(0).default(0).optional(),
  existing_investments: z.number().min(0).default(0),
  emergency_fund: z.number().min(0).default(0),
  total_debt: z.number().min(0).default(0),
  knowledge_level: z.string().max(40).nullable().optional(),
  investment_goal: z.string().max(80).nullable().optional(),
  time_horizon: z.string().max(40).nullable().optional(),
  risk_tolerance: z.string().max(40).nullable().optional(),
});

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProfileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("users_financial_profiles" as never)
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from("users_financial_profiles" as never)
        .update(data as never)
        .eq("user_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("users_financial_profiles" as never)
        .insert({ ...data, user_id: userId } as never);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("users_financial_profiles" as never)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    return { profile: data };
  });

export const getInvestmentDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [p, g, h, s, r] = await Promise.all([
      supabase.from("users_financial_profiles" as never).select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("investment_goals" as never).select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("portfolio_holdings" as never).select("*").eq("user_id", userId),
      supabase.from("financial_health_scores" as never).select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("ai_recommendations" as never).select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);
    return {
      profile: p.data,
      goals: g.data ?? [],
      holdings: h.data ?? [],
      latestScore: s.data,
      recommendations: r.data ?? [],
    };
  });

export const generateStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("users_financial_profiles" as never)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Complete your investment profile first.");

    const text = await aiPrompt(
      `Build an investment strategy from this profile JSON: ${JSON.stringify(profile)}.
Return JSON with shape:
{
  "summary": string (2-3 sentences),
  "monthlyContribution": number,
  "allocation": [ { "name": string, "percentage": number, "rationale": string } ],
  "expectedRisk": string,
  "rationale": string
}
Use percentages that sum to 100.`,
      "You are an educational personal-finance assistant. Respond ONLY with valid JSON matching the requested schema. Educational only, not financial advice.",
    );

    let parsed: any;
    try {
      parsed = parseJsonReply(text);
    } catch {
      parsed = { summary: text, monthlyContribution: 0, allocation: [], expectedRisk: "Unknown", rationale: "" };
    }

    await supabase.from("ai_recommendations" as never).insert({
      user_id: userId,
      kind: "strategy",
      content: parsed,
    } as never);

    return parsed;
  });

export const computeHealthScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("users_financial_profiles" as never)
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Complete your investment profile first.");

    const p = profile as any;
    const income = Number(p.monthly_income) || 0;
    const expenses = Number(p.monthly_expenses) || 0;
    const savings = Number(p.monthly_savings) || 0;
    const emergency = Number(p.emergency_fund) || 0;
    const debt = Number(p.total_debt) || 0;
    const investments = Number(p.existing_investments) || 0;

    const savingsRate = income > 0 ? savings / income : 0;
    const efMonths = expenses > 0 ? emergency / expenses : 0;
    const debtRatio = income > 0 ? debt / (income * 12) : 0;
    const invRate = income > 0 ? investments / (income * 12) : 0;

    let score = 0;
    score += Math.min(25, savingsRate * 100);
    score += Math.min(25, efMonths * 4);
    score += Math.max(0, 25 - debtRatio * 50);
    score += Math.min(15, invRate * 20);
    score += income > expenses ? 10 : 0;
    score = Math.round(Math.max(0, Math.min(100, score)));

    const strengths: string[] = [];
    const improvements: string[] = [];
    if (savingsRate >= 0.2) strengths.push("Strong savings rate");
    else improvements.push("Increase your monthly savings rate");
    if (efMonths >= 6) strengths.push("Healthy emergency fund");
    else improvements.push("Build emergency fund to 6 months of expenses");
    if (debtRatio < 0.2) strengths.push("Low debt levels");
    else improvements.push("Reduce outstanding debt");
    if (invRate >= 0.5) strengths.push("Solid investment base");
    else improvements.push("Increase investment contributions");

    const risk = score >= 80 ? "Low" : score >= 60 ? "Moderate" : score >= 40 ? "Elevated" : "High";

    await supabase.from("financial_health_scores" as never).insert({
      user_id: userId,
      score,
      risk_level: risk,
      strengths,
      improvements,
    } as never);

    return { score, risk_level: risk, strengths, improvements };
  });

const ChatSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(20).default([]),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChatSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: goals }, { data: score }] = await Promise.all([
      supabase.from("users_financial_profiles" as never).select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("investment_goals" as never).select("*").eq("user_id", userId),
      supabase.from("financial_health_scores" as never).select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const system = `You are an educational personal-finance assistant for one user.
Always remind that this is educational and not regulated financial advice when relevant.
Use the user's data when answering. Be concise, friendly, and concrete.

USER PROFILE: ${JSON.stringify(profile ?? {})}
GOALS: ${JSON.stringify(goals ?? [])}
LATEST HEALTH SCORE: ${JSON.stringify(score ?? {})}`;

    const text = await aiText({
      system,
      messages: [
        ...data.history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: data.message },
      ],
    });
    return { reply: text };
  });

const GoalSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(40).optional(),
  target_amount: z.number().positive(),
  current_amount: z.number().min(0).default(0),
  target_date: z.string().optional(),
});

export const addGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => GoalSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("investment_goals" as never).insert({ ...data, user_id: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("investment_goals" as never).delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

const HoldingSchema = z.object({
  symbol: z.string().max(20).optional(),
  name: z.string().min(1).max(120),
  asset_type: z.string().max(40).optional(),
  quantity: z.number().default(0),
  cost_basis: z.number().min(0).default(0),
  current_value: z.number().min(0).default(0),
});

export const addHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => HoldingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("portfolio_holdings" as never).insert({ ...data, user_id: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteHolding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("portfolio_holdings" as never).delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
