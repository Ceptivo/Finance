import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aiPrompt, parseJsonReply } from "./ai.server";
import { z } from "zod";

export const processStatementText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ 
    text: z.string(),
    filename: z.string(),
    accountId: z.string().uuid()
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const prompt = "Analyze this SA bank statement text: " + data.text + ". Return JSON array of transactions with amount, merchant, date, and type (income/expense).";
    const response = await aiPrompt(prompt, "Return valid JSON only.", undefined, userId);
    const transactions = parseJsonReply(response);
    await supabase.from("bank_statements").insert({ user_id: userId, filename: data.filename });
    for (const tx of transactions) {
      const table = tx.type === 'income' ? 'incomes' : 'expenses';
      await supabase.from(table).insert({ ...tx, user_id: userId, account_id: data.accountId });
    }
    return { count: transactions.length };
  });
