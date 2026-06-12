import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiText, imageBlock, pdfBlock, parseJsonReply } from "./ai.server";
import { requirePremium } from "./premium.server";

const EXPENSE_CATS = [
  "Food","Groceries","Rent","Transport","Utilities","Entertainment",
  "Health","Shopping","Travel","Subscriptions","Business","Other",
] as const;
const INCOME_CATS = [
  "Salary","Freelance","Business","Investments","Side Hustle","Refund","Gift","Other",
] as const;

const TxSchema = z.object({
  date: z.string().default(""),
  description: z.string().default(""),
  amount: z.number().default(0),
  type: z.enum(["income", "expense"]).default("expense"),
  category: z.string().default("Other"),
});

const ParsedSchema = z.object({
  label: z.string().default("Bank Statement"),
  currency: z.string().default("USD"),
  period_start: z.string().default(""),
  period_end: z.string().default(""),
  accounts: z.array(z.object({
    name: z.string().default("Account"),
    type: z.string().default("bank"),
    closing_balance: z.number().default(0),
  })).default([]),
  transactions: z.array(TxSchema).default([]),
  subscriptions: z.array(z.object({
    name: z.string(),
    amount: z.number().default(0),
    cycle: z.enum(["monthly","yearly"]).default("monthly"),
  })).default([]),
  insights: z.string().default(""),
});

export type ParsedStatement = z.infer<typeof ParsedSchema>;

const UploadInput = z.object({
  filename: z.string().max(255),
  mimeType: z.string().max(80),
  base64: z.string().min(20).max(20_000_000),
});

export const uploadStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UploadInput.parse(d))
  .handler(async ({ data, context }) => {
    const isPdf = data.mimeType.includes("pdf");
    const isText = /^text\/|csv|json/.test(data.mimeType);
    const systemPrompt = `You are a bank statement parser. Extract structured data from the statement and reply ONLY with minified valid JSON (no prose, no code fences).

Schema:
{
  "label": short label like "Chase Checking — Aug 2025",
  "currency": ISO code like "USD" / "ZAR" / "EUR",
  "period_start": "YYYY-MM-DD",
  "period_end": "YYYY-MM-DD",
  "accounts": [{"name": string, "type": "bank"|"savings"|"credit"|"cash", "closing_balance": number}],
  "transactions": [{"date":"YYYY-MM-DD","description":string,"amount":number (always positive),"type":"income"|"expense","category": one of [${[...EXPENSE_CATS, ...INCOME_CATS].join(", ")}]}],
  "subscriptions": [{"name":string,"amount":number,"cycle":"monthly"|"yearly"}],
  "insights": 3-5 short sentences about spending behavior, savings habits, flagged behavior, and concrete recommendations
}

Rules: amounts always positive numbers, classify income vs expense correctly, identify recurring charges as subscriptions, infer reasonable categories.`;

    const { supabase, userId } = context;
    await requirePremium(supabase, userId, (context as any).claims);
    const text = await aiText({
      rateKey: userId,
      tier: "deep",
      system: systemPrompt,
      maxTokens: 64000,
      messages: [
        {
          role: "user",
          content: isText
            ? [
                {
                  type: "text",
                  text: `Parse this bank statement (raw ${data.mimeType} content):\n\n${Buffer.from(data.base64, "base64").toString("utf-8").slice(0, 400_000)}`,
                },
              ]
            : [
                { type: "text", text: "Parse this bank statement." },
                isPdf ? pdfBlock(data.base64) : imageBlock(data.base64, data.mimeType),
              ],
        },
      ],
    });

    let parsed: ParsedStatement;
    try {
      parsed = ParsedSchema.parse(parseJsonReply(text));
    } catch (e) {
      throw new Error("Could not parse statement. Try a clearer file.");
    }

    const totalIncome = parsed.transactions.filter(t => t.type === "income").reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalExpense = parsed.transactions.filter(t => t.type === "expense").reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const { data: inserted, error } = await supabase
      .from("past_statements" as never)
      .insert({
        user_id: userId,
        label: parsed.label || data.filename,
        period_start: parsed.period_start || null,
        period_end: parsed.period_end || null,
        currency: parsed.currency || "USD",
        total_income: totalIncome,
        total_expense: totalExpense,
        net: totalIncome - totalExpense,
        parsed: parsed as any,
        insights: parsed.insights || null,
        source_filename: data.filename,
      } as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: (inserted as any).id };
  });

export const listStatements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("past_statements" as never)
      .select("id,label,period_start,period_end,currency,total_income,total_expense,net,created_at,source_filename")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as any[] };
  });

export const getStatement = createServerFn({ method: "GET" })
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
    return { item: row as any };
  });

export const deleteStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("past_statements" as never)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
