import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function isMissingColumnOrTable(message: string) {
  return /relation .* does not exist|Could not find the table|column .* does not exist|last_posted_renewal/i.test(
    message,
  );
}

/* ----------------------------------------------------------------
 * Subscriptions → expenses auto-posting.
 * When a subscription's next_renewal date has passed, post it as an
 * expense, advance next_renewal by one cycle, and remember the posted
 * date so charges are never double-posted.
 * ---------------------------------------------------------------- */

function addCycle(date: string, cycle: string): string {
  const d = new Date(date + "T00:00:00Z");
  if (cycle === "yearly") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export const postDueSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date().toISOString().slice(0, 10);

    const { data: subs, error } = await supabase
      .from("subscriptions" as never)
      .select("*")
      .eq("user_id", userId)
      .not("next_renewal", "is", null)
      .lte("next_renewal", today);
    if (error) {
      if (isMissingColumnOrTable(error.message)) return { posted: [] as string[], skipped: true };
      throw new Error(error.message);
    }

    const posted: string[] = [];
    for (const s of (subs ?? []) as any[]) {
      // Subscription ended? Don't post past billing_end.
      if (s.billing_end && s.next_renewal > s.billing_end) continue;

      let renewal: string = s.next_renewal;
      let lastPosted: string | null = s.last_posted_renewal ?? null;
      // Post each missed cycle (capped to avoid runaway loops on stale data).
      for (let i = 0; i < 12 && renewal <= today; i++) {
        if (!lastPosted || renewal > lastPosted) {
          const { error: insErr } = await supabase.from("expenses" as never).insert({
            user_id: userId,
            merchant: s.name,
            category: "Subscriptions",
            amount: Number(s.amount) || 0,
            occurred_on: renewal,
            notes: "Auto-posted subscription renewal",
            account_id: s.account_id ?? null,
          } as never);
          if (!insErr) {
            posted.push(`${s.name} (${renewal})`);
            lastPosted = renewal;
          }
        }
        renewal = addCycle(renewal, s.cycle);
      }

      const patch: any = { next_renewal: renewal };
      if (lastPosted) patch.last_posted_renewal = lastPosted;
      const { error: upErr } = await supabase
        .from("subscriptions" as never)
        .update(patch as never)
        .eq("id", s.id)
        .eq("user_id", userId);
      // If last_posted_renewal column is missing (migration not run), still advance the date.
      if (upErr && isMissingColumnOrTable(upErr.message)) {
        await supabase
          .from("subscriptions" as never)
          .update({ next_renewal: renewal } as never)
          .eq("id", s.id)
          .eq("user_id", userId);
      }
    }

    return { posted, skipped: false };
  });

/** Subscriptions renewing within the next N days — for in-app reminders. */
export const getUpcomingRenewals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const today = new Date();
    const horizon = new Date(today.getTime() + 7 * 86400_000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("subscriptions" as never)
      .select("id,name,amount,cycle,next_renewal")
      .eq("user_id", userId)
      .gt("next_renewal", today.toISOString().slice(0, 10))
      .lte("next_renewal", horizon)
      .order("next_renewal");
    return { items: (data ?? []) as any[] };
  });

/* ----------------------------------------------------------------
 * Net worth snapshots — accounts + holdings + invested custom markets,
 * minus liabilities. One row per day (upsert).
 * ---------------------------------------------------------------- */

export const snapshotNetWorth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: accounts }, { data: holdings }, { data: customs }] = await Promise.all([
      supabase
        .from("accounts" as never)
        .select("balance,is_liability")
        .eq("user_id", userId),
      supabase
        .from("portfolio_holdings" as never)
        .select("current_value")
        .eq("user_id", userId),
      supabase
        .from("custom_markets" as never)
        .select("invested_amount")
        .eq("user_id", userId),
    ]);

    let assets = 0;
    let liabilities = 0;
    for (const a of (accounts ?? []) as any[]) {
      const bal = Number(a.balance) || 0;
      if (a.is_liability) liabilities += Math.abs(bal);
      else assets += bal;
    }
    for (const h of (holdings ?? []) as any[]) assets += Number(h.current_value) || 0;
    for (const c of (customs ?? []) as any[]) assets += Number(c.invested_amount) || 0;

    const netWorth = assets - liabilities;
    const today = new Date().toISOString().slice(0, 10);
    // Delete-then-insert: idempotent even without a unique constraint.
    await supabase
      .from("net_worth_snapshots" as never)
      .delete()
      .eq("user_id", userId)
      .eq("snapshot_date", today);
    const { error } = await supabase.from("net_worth_snapshots" as never).insert({
      user_id: userId,
      snapshot_date: today,
      assets: Math.round(assets * 100) / 100,
      liabilities: Math.round(liabilities * 100) / 100,
      net_worth: Math.round(netWorth * 100) / 100,
    } as never);
    if (error && !isMissingColumnOrTable(error.message)) throw new Error(error.message);
    return { netWorth, assets, liabilities, recorded: !error };
  });

export const getNetWorthHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.number().int().min(7).max(1830).default(365) }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const since = new Date(Date.now() - data.days * 86400_000).toISOString().slice(0, 10);
    const { data: rows, error } = await supabase
      .from("net_worth_snapshots" as never)
      .select("snapshot_date,assets,liabilities,net_worth")
      .eq("user_id", userId)
      .gte("snapshot_date", since)
      .order("snapshot_date");
    if (error) {
      if (isMissingColumnOrTable(error.message)) return { points: [], available: false };
      throw new Error(error.message);
    }
    return {
      points: ((rows ?? []) as any[]).map((r) => ({
        date: r.snapshot_date,
        netWorth: Number(r.net_worth) || 0,
        assets: Number(r.assets) || 0,
        liabilities: Number(r.liabilities) || 0,
      })),
      available: true,
    };
  });

/* ----------------------------------------------------------------
 * Import a parsed past statement into live data (incomes/expenses).
 * ---------------------------------------------------------------- */

export const importStatementToLive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("past_statements" as never)
      .select("parsed,label")
      .eq("id", data.id)
      .eq("user_id", userId)
      .single();
    if (error) throw new Error(error.message);

    const parsed = (row as any)?.parsed ?? {};
    const txs: any[] = parsed.transactions ?? [];
    if (txs.length === 0) throw new Error("This statement has no parsed transactions.");

    const incomes = txs
      .filter((t) => t.type === "income")
      .map((t) => ({
        user_id: userId,
        source: String(t.description ?? "Imported income").slice(0, 120),
        category: t.category ?? "Other",
        amount: Math.abs(Number(t.amount) || 0),
        occurred_on: t.date,
        notes: `Imported from "${(row as any).label}"`,
      }))
      .filter((t) => t.amount > 0 && t.occurred_on);

    const expenses = txs
      .filter((t) => t.type === "expense")
      .map((t) => ({
        user_id: userId,
        merchant: String(t.description ?? "Imported expense").slice(0, 120),
        category: t.category ?? "Other",
        amount: Math.abs(Number(t.amount) || 0),
        occurred_on: t.date,
        notes: `Imported from "${(row as any).label}"`,
      }))
      .filter((t) => t.amount > 0 && t.occurred_on);

    if (incomes.length) {
      const { error: e1 } = await supabase.from("incomes" as never).insert(incomes as never);
      if (e1) throw new Error(e1.message);
    }
    if (expenses.length) {
      const { error: e2 } = await supabase.from("expenses" as never).insert(expenses as never);
      if (e2) throw new Error(e2.message);
    }

    return { incomes: incomes.length, expenses: expenses.length };
  });
