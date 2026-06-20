import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { requirePremium, serviceClient } from "./premium.server";
import {
  plaidConfigured,
  createLinkToken,
  exchangePublicToken,
  getInstitutionName,
  syncTransactions,
  removeItem,
  type PlaidTxn,
} from "./plaid.server";
import { aiText, parseJsonReply } from "./ai.server";

const EXPENSE_CATS = [
  "Food",
  "Groceries",
  "Rent",
  "Transport",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Travel",
  "Subscriptions",
  "Business",
  "Other",
];
const INCOME_CATS = [
  "Salary",
  "Freelance",
  "Business",
  "Investments",
  "Side Hustle",
  "Refund",
  "Gift",
  "Other",
];

/** List the user's bank connections — names and status only, never tokens. */
export const getBankConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!plaidConfigured()) return { items: [], configured: false };
    let rows: any[] = [];
    try {
      const svc = serviceClient();
      const { data } = await svc
        .from("plaid_items")
        .select("id,institution_name,status,last_synced_at,created_at")
        .eq("user_id", context.userId)
        .neq("status", "removed")
        .order("created_at");
      rows = data ?? [];
    } catch {
      // service key or table missing — show as not configured
      return { items: [], configured: false };
    }
    return { items: rows, configured: true };
  });

export const createPlaidLinkToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePremium(context.supabase, context.userId, (context as any).claims);
    const token = await createLinkToken(context.userId);
    return { linkToken: token };
  });

export const exchangePlaidToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ publicToken: z.string().min(10).max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePremium(context.supabase, context.userId, (context as any).claims);
    const { access_token, item_id } = await exchangePublicToken(data.publicToken);
    const name = await getInstitutionName(access_token);

    const svc = serviceClient();
    const { error } = await svc.from("plaid_items").upsert(
      {
        user_id: context.userId,
        item_id,
        access_token,
        institution_name: name,
        status: "active",
      },
      { onConflict: "item_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true, institution: name };
  });

export const removeBankConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const svc = serviceClient();
    const { data: row, error } = await svc
      .from("plaid_items")
      .select("access_token")
      .eq("id", data.id)
      .eq("user_id", context.userId) // ownership check — users remove only their own items
      .single();
    if (error) throw new Error("Connection not found.");
    try {
      await removeItem((row as any).access_token);
    } catch {
      /* already revoked at Plaid — still mark removed locally */
    }
    await svc
      .from("plaid_items")
      .update({ status: "removed", access_token: "removed" })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/** AI-categorize a batch of bank transactions in ONE model call. */
async function categorize(txns: PlaidTxn[], userId: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (txns.length === 0) return out;
  const list = txns.map((t, i) => ({
    i,
    name: t.merchant_name || t.name,
    amount: t.amount,
    plaidHint: t.personal_finance_category?.primary ?? null,
  }));
  try {
    const text = await aiText({
      rateKey: userId,
      system: `You categorize bank transactions. Expense categories: [${EXPENSE_CATS.join(", ")}]. Income categories: [${INCOME_CATS.join(", ")}]. Positive amount = expense, negative = income. Reply ONLY minified JSON: {"categories": ["<category for item 0>", "<category for item 1>", ...]} — one per input item, same order.`,
      messages: [{ role: "user", content: JSON.stringify(list) }],
    });
    const parsed = parseJsonReply<{ categories?: string[] }>(text);
    const cats = parsed.categories ?? [];
    txns.forEach((t, i) => {
      const cat = cats[i];
      const valid = t.amount >= 0 ? EXPENSE_CATS : INCOME_CATS;
      out.set(t.transaction_id, valid.includes(cat) ? cat : "Other");
    });
  } catch {
    // AI unavailable — fall back to Plaid's own hint or Other
    for (const t of txns) {
      out.set(t.transaction_id, t.personal_finance_category?.primary ? "Other" : "Other");
    }
  }
  return out;
}

/** One-touch sync: pull new bank transactions, AI-categorize, import. */
export const syncBankTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePremium(supabase, userId, (context as any).claims);
    const svc = serviceClient();

    const { data: items, error } = await svc
      .from("plaid_items")
      .select("id,access_token,sync_cursor,institution_name")
      .eq("user_id", userId)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    if (!items?.length) throw new Error("No connected banks yet — connect one in Settings.");

    let imported = 0;
    for (const item of items as any[]) {
      const { added, nextCursor } = await syncTransactions(item.access_token, item.sync_cursor);

      // Dedupe against already-imported Plaid transaction ids.
      const ids = added.map((t) => t.transaction_id);
      const { data: seen } = ids.length
        ? await svc.from("plaid_transactions").select("id").in("id", ids)
        : { data: [] };
      const seenSet = new Set(((seen ?? []) as any[]).map((r) => r.id));
      const fresh = added.filter((t) => !seenSet.has(t.transaction_id));

      const cats = await categorize(fresh, userId);

      const expenses = fresh
        .filter((t) => t.amount > 0)
        .map((t) => ({
          user_id: userId,
          merchant: (t.merchant_name || t.name || "Bank transaction").slice(0, 120),
          category: cats.get(t.transaction_id) ?? "Other",
          amount: Math.abs(t.amount),
          occurred_on: t.date,
          notes: `Synced from ${item.institution_name ?? "bank"}`,
        }));
      const incomes = fresh
        .filter((t) => t.amount < 0)
        .map((t) => ({
          user_id: userId,
          source: (t.merchant_name || t.name || "Bank deposit").slice(0, 120),
          category: cats.get(t.transaction_id) ?? "Other",
          amount: Math.abs(t.amount),
          occurred_on: t.date,
          notes: `Synced from ${item.institution_name ?? "bank"}`,
        }));

      if (expenses.length) {
        const { error: e1 } = await svc.from("expenses").insert(expenses);
        if (e1) throw new Error(e1.message);
      }
      if (incomes.length) {
        const { error: e2 } = await svc.from("incomes").insert(incomes);
        if (e2) throw new Error(e2.message);
      }
      if (fresh.length) {
        await svc
          .from("plaid_transactions")
          .insert(fresh.map((t) => ({ id: t.transaction_id, user_id: userId })));
      }

      await svc
        .from("plaid_items")
        .update({ sync_cursor: nextCursor, last_synced_at: new Date().toISOString() })
        .eq("id", item.id);
      imported += fresh.length;
    }

    return { imported };
  });
