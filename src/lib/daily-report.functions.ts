import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiText } from "./ai.server";

export const generateDailyReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const [{ data: incs }, { data: exps }, { data: subs }, { data: accts }] = await Promise.all([
      supabase.from("incomes" as never).select("amount,occurred_on,category,source").eq("user_id", userId).gte("occurred_on", since),
      supabase.from("expenses" as never).select("amount,occurred_on,category,merchant").eq("user_id", userId).gte("occurred_on", since),
      supabase.from("subscriptions" as never).select("name,amount,cycle").eq("user_id", userId),
      supabase.from("accounts" as never).select("name,type,balance,is_liability").eq("user_id", userId),
    ]);

    const totalIncome = (incs ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const totalExpense = (exps ?? []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const monthlySubs = (subs ?? []).reduce((s: number, r: any) =>
      s + (r.cycle === "yearly" ? Number(r.amount || 0) / 12 : Number(r.amount || 0)), 0);

    const summary = {
      window_days: 30,
      total_income: totalIncome,
      total_expense: totalExpense,
      net: totalIncome - totalExpense,
      monthly_subscriptions: monthlySubs,
      accounts: accts ?? [],
      expense_count: (exps ?? []).length,
      income_count: (incs ?? []).length,
      top_expenses: (exps ?? [])
        .map((e: any) => ({ merchant: e.merchant, category: e.category, amount: Number(e.amount) || 0 }))
        .sort((a: any, b: any) => b.amount - a.amount)
        .slice(0, 10),
    };

    const text = await aiText({
      rateKey: userId,
      system: `You are a personal finance coach. Analyze the user's last 30 days. Output in markdown with these sections (use ## headings):
## Today's Snapshot
## Flags
## What you're doing well
## What to do differently
## 3 concrete actions for today

Keep it concise, specific, friendly, and direct. Use the user's currency-agnostic numbers. Educational only — no regulated financial advice.`,
      messages: [{ role: "user", content: `Data: ${JSON.stringify(summary)}` }],
    });

    return { report: text, summary };
  });
