import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Budgets require the budgets table (supabase/migrations/20260611140000_*.sql).
// Every function degrades gracefully when the migration hasn't been run yet.

const MIGRATION_HINT =
  "Budgets table missing — run the migration in supabase/migrations/20260611140000_budgets_networth_indexes.sql (Supabase dashboard → SQL editor).";

function isMissingTable(message: string) {
  return /relation .* does not exist|Could not find the table/i.test(message);
}

export const listBudgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: budgets, error }, { data: expenses }] = await Promise.all([
      supabase
        .from("budgets" as never)
        .select("*")
        .eq("user_id", userId)
        .order("category"),
      supabase
        .from("expenses" as never)
        .select("category,amount,occurred_on")
        .eq("user_id", userId)
        .gte("occurred_on", new Date().toISOString().slice(0, 7) + "-01"),
    ]);

    if (error) {
      if (isMissingTable(error.message))
        return { items: [], available: false, hint: MIGRATION_HINT };
      throw new Error(error.message);
    }

    const spent = new Map<string, number>();
    for (const e of (expenses ?? []) as any[]) {
      const cat = e.category ?? "Other";
      spent.set(cat, (spent.get(cat) ?? 0) + (Number(e.amount) || 0));
    }

    const items = ((budgets ?? []) as any[]).map((b) => {
      const used = spent.get(b.category) ?? 0;
      // Schema truth is limit_amount; tolerate legacy monthly_limit rows.
      const limit = Number(b.limit_amount ?? b.monthly_limit) || 0;
      return {
        id: b.id,
        category: b.category,
        monthly_limit: limit,
        spent: Math.round(used * 100) / 100,
        pct: limit > 0 ? Math.round((used / limit) * 100) : 0,
        remaining: Math.round((limit - used) * 100) / 100,
      };
    });

    return { items, available: true, hint: null as string | null };
  });

export const upsertBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.string().min(1).max(40),
        monthly_limit: z.number().min(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Manual upsert — works whether or not the unique constraint exists.
    const { data: existing, error: selErr } = await supabase
      .from("budgets" as never)
      .select("id")
      .eq("user_id", userId)
      .eq("category", data.category)
      .maybeSingle();
    if (selErr) throw new Error(isMissingTable(selErr.message) ? MIGRATION_HINT : selErr.message);
    const { error } = existing
      ? await supabase
          .from("budgets" as never)
          .update({ limit_amount: data.monthly_limit } as never)
          .eq("id", (existing as any).id)
          .eq("user_id", userId)
      : await supabase.from("budgets" as never).insert({
          user_id: userId,
          category: data.category,
          limit_amount: data.monthly_limit,
          period: "monthly",
        } as never);
    if (error) throw new Error(isMissingTable(error.message) ? MIGRATION_HINT : error.message);
    return { ok: true };
  });

export const deleteBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("budgets" as never)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
