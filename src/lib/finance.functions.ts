import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// List queries are bounded: by default they fetch from Jan 1 of last year
// (covers YTD + last-year comparisons) capped at 5000 rows, instead of the
// user's entire history. Pass { since } to reach further back.
const ListOptions = z.object({ since: z.string().optional() }).optional();
function defaultSince() {
  return `${new Date().getFullYear() - 1}-01-01`;
}

/* ---------------- Accounts ---------------- */

const AccountInput = z.object({
  name: z.string().min(1).max(60),
  type: z.string().max(40).default("bank"),
  balance: z.number().default(0),
  currency: z.string().max(8).default("USD"),
  color: z.string().max(20).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  is_liability: z.boolean().default(false),
});

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("accounts" as never)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as any[] };
  });

export const addAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AccountInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("accounts" as never)
      .insert({ ...data, user_id: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), patch: AccountInput.partial() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("accounts" as never)
      .update(data.patch as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("accounts" as never)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Incomes ---------------- */

const IncomeInput = z.object({
  source: z.string().min(1).max(120),
  category: z.string().max(40).nullable().optional(),
  amount: z.number().positive(),
  occurred_on: z.string(),
  occurred_at: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
});

export const listIncomes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListOptions.parse(d ?? undefined))
  .handler(async ({ data: opts, context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("incomes" as never)
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_on", opts?.since ?? defaultSince())
      .order("occurred_on", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as any[] };
  });

export const addIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IncomeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("incomes" as never)
      .insert({ ...data, user_id: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteIncome = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("incomes" as never)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Expenses ---------------- */

const ExpenseInput = z.object({
  merchant: z.string().min(1).max(120),
  category: z.string().max(40).nullable().optional(),
  amount: z.number().positive(),
  occurred_on: z.string(),
  occurred_at: z.string().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
});

export const listExpenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ListOptions.parse(d ?? undefined))
  .handler(async ({ data: opts, context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("expenses" as never)
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_on", opts?.since ?? defaultSince())
      .order("occurred_on", { ascending: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as any[] };
  });

export const addExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExpenseInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("expenses" as never)
      .insert({ ...data, user_id: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("expenses" as never)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- Subscriptions ---------------- */

const SubscriptionInput = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(40).nullable().optional(),
  amount: z.number().positive(),
  cycle: z.enum(["monthly", "yearly"]).default("monthly"),
  next_renewal: z.string().nullable().optional(),
  billing_start: z.string().nullable().optional(),
  billing_end: z.string().nullable().optional(),
  account_id: z.string().uuid().nullable().optional(),
});

export const listSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("subscriptions" as never)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as any[] };
  });

export const addSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubscriptionInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("subscriptions" as never)
      .insert({ ...data, user_id: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("subscriptions" as never)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
