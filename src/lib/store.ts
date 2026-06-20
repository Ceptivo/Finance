import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  addAccount, deleteAccount, listAccounts, updateAccount,
  addExpense, deleteExpense, listExpenses,
  addIncome, deleteIncome, listIncomes,
  addSubscription, deleteSubscription, listSubscriptions,
} from "./finance.functions";
import { listCategories } from "./categories.functions";

/* ---------- Types (legacy API shape, mapped from DB rows) ---------- */

export type IncomeCategory =
  | "Salary" | "Freelance" | "Business" | "Investments"
  | "Side Hustle" | "Refund" | "Gift" | "Other";

export type ExpenseCategory =
  | "Food" | "Groceries" | "Rent" | "Transport" | "Utilities"
  | "Entertainment" | "Health" | "Shopping" | "Travel"
  | "Subscriptions" | "Business" | "Other";

export type SubCategory =
  | "AI" | "Software" | "Hosting" | "Productivity" | "Entertainment" | "Other";

export interface IncomeEntry {
  id: string;
  date: string;
  time?: string | null;
  source: string;
  category: IncomeCategory;
  amount: number;
  note?: string;
  accountId?: string | null;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  time?: string | null;
  description: string;
  category: ExpenseCategory;
  cost: number;
  note?: string;
  receiptUrl?: string;
  accountId?: string | null;
}

export interface SubscriptionEntry {
  id: string;
  name: string;
  category: SubCategory;
  monthlyCost: number;
  billingCycle: "Monthly" | "Yearly";
  nextCharge: string;
  billingStart?: string | null;
  billingEnd?: string | null;
  status: "Active" | "Paused";
  accountId?: string | null;
}

export interface AccountEntry {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
  color: string | null;
  icon: string | null;
  isLiability: boolean;
}

export const INCOME_CATEGORIES: IncomeCategory[] = [
  "Salary","Freelance","Business","Investments","Side Hustle","Refund","Gift","Other",
];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Food","Groceries","Rent","Transport","Utilities","Entertainment","Health","Shopping","Travel","Subscriptions","Business","Other",
];
export const SUB_CATEGORIES: SubCategory[] = [
  "AI","Software","Hosting","Productivity","Entertainment","Other",
];

export const newId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)) as string;

export const todayISO = () => new Date().toISOString().slice(0, 10);

/* ---------- Mapping helpers ---------- */

function mapIncome(r: any): IncomeEntry {
  return {
    id: r.id,
    date: r.occurred_on,
    time: r.occurred_at ?? null,
    source: r.source,
    category: (r.category ?? "Other") as IncomeCategory,
    amount: Number(r.amount) || 0,
    note: r.notes ?? undefined,
    accountId: r.account_id ?? null,
  };
}
function mapExpense(r: any): ExpenseEntry {
  return {
    id: r.id,
    date: r.occurred_on,
    time: r.occurred_at ?? null,
    description: r.merchant,
    category: (r.category ?? "Other") as ExpenseCategory,
    cost: Number(r.amount) || 0,
    note: r.notes ?? undefined,
    accountId: r.account_id ?? null,
  };
}
function mapSub(r: any): SubscriptionEntry {
  const billingCycle: "Monthly" | "Yearly" = r.cycle === "yearly" ? "Yearly" : "Monthly";
  const amt = Number(r.amount) || 0;
  const monthlyCost = billingCycle === "Yearly" ? amt / 12 : amt;
  return {
    id: r.id,
    name: r.name,
    category: (r.category ?? "Other") as SubCategory,
    monthlyCost,
    billingCycle,
    nextCharge: r.next_renewal ?? todayISO(),
    billingStart: r.billing_start ?? null,
    billingEnd: r.billing_end ?? null,
    status: "Active",
    accountId: r.account_id ?? null,
  };
}
function mapAccount(r: any): AccountEntry {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    balance: Number(r.balance) || 0,
    currency: r.currency,
    color: r.color,
    icon: r.icon,
    isLiability: !!r.is_liability,
  };
}

/* ---------- Hooks ---------- */

export function useAccounts() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAccounts);
  const addFn = useServerFn(addAccount);
  const updFn = useServerFn(updateAccount);
  const delFn = useServerFn(deleteAccount);

  const q = useQuery({
    queryKey: ["accounts"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  const items: AccountEntry[] = (q.data?.items ?? []).map(mapAccount);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["accounts"] });

  const add = useMutation({
    mutationFn: (a: Omit<AccountEntry, "id">) =>
      addFn({
        data: {
          name: a.name, type: a.type, balance: a.balance, currency: a.currency,
          color: a.color, icon: a.icon, is_liability: a.isLiability,
        },
      }),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AccountEntry> }) =>
      updFn({
        data: {
          id,
          patch: {
            name: patch.name, type: patch.type, balance: patch.balance, currency: patch.currency,
            color: patch.color, icon: patch.icon, is_liability: patch.isLiability,
          },
        },
      }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["subscriptions"] });
      const prev = qc.getQueryData<{ items: any[] }>(["subscriptions"]);
      qc.setQueryData(["subscriptions"], (old: { items: any[] } | undefined) => ({
        items: (old?.items ?? []).filter((r) => r.id !== id),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["subscriptions"], ctx.prev); },
    onSettled: invalidate,
  });

  return {
    items,
    isLoading: q.isLoading,
    add: (a: Omit<AccountEntry, "id">) => add.mutateAsync(a),
    update: (id: string, patch: Partial<AccountEntry>) => update.mutateAsync({ id, patch }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}

export function useIncomes() {
  const qc = useQueryClient();
  const listFn = useServerFn(listIncomes);
  const addFn = useServerFn(addIncome);
  const delFn = useServerFn(deleteIncome);

  const q = useQuery({ queryKey: ["incomes"], queryFn: () => listFn(), staleTime: 15_000 });
  const items: IncomeEntry[] = (q.data?.items ?? []).map(mapIncome);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["incomes"] });

  const add = useMutation({
    mutationFn: (e: Omit<IncomeEntry, "id">) =>
      addFn({
        data: {
          source: e.source, category: e.category, amount: e.amount,
          occurred_on: e.date, occurred_at: e.time ?? null,
          notes: e.note ?? null, account_id: e.accountId ?? null,
        },
      }),
    // Optimistic: show the new entry instantly, roll back on failure.
    onMutate: async (e) => {
      await qc.cancelQueries({ queryKey: ["incomes"] });
      const prev = qc.getQueryData<{ items: any[] }>(["incomes"]);
      qc.setQueryData(["incomes"], (old: { items: any[] } | undefined) => ({
        items: [
          { id: `optimistic-${Date.now()}`, source: e.source, category: e.category,
            amount: e.amount, occurred_on: e.date, occurred_at: e.time ?? null,
            notes: e.note ?? null, account_id: e.accountId ?? null },
          ...(old?.items ?? []),
        ],
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["incomes"], ctx.prev); },
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["incomes"] });
      const prev = qc.getQueryData<{ items: any[] }>(["incomes"]);
      qc.setQueryData(["incomes"], (old: { items: any[] } | undefined) => ({
        items: (old?.items ?? []).filter((r) => r.id !== id),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["incomes"], ctx.prev); },
    onSettled: invalidate,
  });

  return {
    items,
    isLoading: q.isLoading,
    add: (e: Omit<IncomeEntry, "id">) => add.mutateAsync(e),
    remove: (id: string) => remove.mutateAsync(id),
  };
}

export function useExpenses() {
  const qc = useQueryClient();
  const listFn = useServerFn(listExpenses);
  const addFn = useServerFn(addExpense);
  const delFn = useServerFn(deleteExpense);

  const q = useQuery({ queryKey: ["expenses"], queryFn: () => listFn(), staleTime: 15_000 });
  const items: ExpenseEntry[] = (q.data?.items ?? []).map(mapExpense);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["expenses"] });

  const add = useMutation({
    mutationFn: (e: Omit<ExpenseEntry, "id">) =>
      addFn({
        data: {
          merchant: e.description, category: e.category, amount: e.cost,
          occurred_on: e.date, occurred_at: e.time ?? null,
          notes: e.note ?? null, account_id: e.accountId ?? null,
        },
      }),
    onMutate: async (e) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });
      const prev = qc.getQueryData<{ items: any[] }>(["expenses"]);
      qc.setQueryData(["expenses"], (old: { items: any[] } | undefined) => ({
        items: [
          { id: `optimistic-${Date.now()}`, merchant: e.description, category: e.category,
            amount: e.cost, occurred_on: e.date, occurred_at: e.time ?? null,
            notes: e.note ?? null, account_id: e.accountId ?? null },
          ...(old?.items ?? []),
        ],
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["expenses"], ctx.prev); },
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["expenses"] });
      const prev = qc.getQueryData<{ items: any[] }>(["expenses"]);
      qc.setQueryData(["expenses"], (old: { items: any[] } | undefined) => ({
        items: (old?.items ?? []).filter((r) => r.id !== id),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["expenses"], ctx.prev); },
    onSettled: invalidate,
  });

  return {
    items,
    isLoading: q.isLoading,
    add: (e: Omit<ExpenseEntry, "id">) => add.mutateAsync(e),
    remove: (id: string) => remove.mutateAsync(id),
  };
}

export function useSubs() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSubscriptions);
  const addFn = useServerFn(addSubscription);
  const delFn = useServerFn(deleteSubscription);

  const q = useQuery({ queryKey: ["subscriptions"], queryFn: () => listFn(), staleTime: 30_000 });
  const items: SubscriptionEntry[] = (q.data?.items ?? []).map(mapSub);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["subscriptions"] });

  const add = useMutation({
    mutationFn: (e: Omit<SubscriptionEntry, "id">) =>
      addFn({
        data: {
          name: e.name,
          category: e.category,
          amount: e.billingCycle === "Yearly" ? e.monthlyCost * 12 : e.monthlyCost,
          cycle: e.billingCycle === "Yearly" ? "yearly" : "monthly",
          next_renewal: e.nextCharge,
          billing_start: e.billingStart ?? null,
          billing_end: e.billingEnd ?? null,
          account_id: e.accountId ?? null,
        },
      }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["subscriptions"] });
      const prev = qc.getQueryData<{ items: any[] }>(["subscriptions"]);
      qc.setQueryData(["subscriptions"], (old: { items: any[] } | undefined) => ({
        items: (old?.items ?? []).filter((r) => r.id !== id),
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) qc.setQueryData(["subscriptions"], ctx.prev); },
    onSettled: invalidate,
  });

  return {
    items,
    isLoading: q.isLoading,
    add: (e: Omit<SubscriptionEntry, "id">) => add.mutateAsync(e),
    remove: (id: string) => remove.mutateAsync(id),
    // Pause/resume isn't persisted in v1 of sync; kept as no-op for back-compat.
    update: (_id: string, _patch: Partial<SubscriptionEntry>) => Promise.resolve(),
  };
}

/* ---------- Custom Categories ---------- */

export type CustomCategory = {
  id: string;
  name: string;
  kind: "income" | "expense" | "both";
  icon: string;
  color: string;
};

export function useCustomCategories() {
  const listFn = useServerFn(listCategories);
  const q = useQuery({ queryKey: ["categories"], queryFn: () => listFn(), staleTime: 30_000 });
  const items: CustomCategory[] = (q.data?.items ?? []) as any;
  return { items, isLoading: q.isLoading };
}

export function mergedCategoryNames(
  builtins: readonly string[],
  custom: CustomCategory[],
  kind: "income" | "expense",
): string[] {
  const list = custom.filter((c) => c.kind === kind || c.kind === "both").map((c) => c.name);
  return Array.from(new Set([...builtins, ...list]));
}

/* ---------- Derived helpers ---------- */


export function monthKey(d: string) { return d.slice(0, 7); }
export function yearKey(d: string) { return d.slice(0, 4); }

export function sumByCategory<T extends { category: string; amount?: number; cost?: number }>(
  items: T[],
  field: "amount" | "cost",
) {
  const map = new Map<string, number>();
  for (const i of items) map.set(i.category, (map.get(i.category) ?? 0) + (Number(i[field]) || 0));
  return Array.from(map, ([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}

export function inMonth(date: string, ym = new Date().toISOString().slice(0, 7)) {
  return date.startsWith(ym);
}
export function inYear(date: string, y = String(new Date().getFullYear())) {
  return date.startsWith(y);
}
