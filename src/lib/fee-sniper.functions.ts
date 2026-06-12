import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const detectBankFees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Scan the last 30 days of expenses for fee-like charges.
    const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
    const { data: rows } = await supabase
      .from("expenses" as never)
      .select("id,merchant,category,amount,occurred_on,notes")
      .eq("user_id", userId)
      .gte("occurred_on", since)
      .or(
        "merchant.ilike.%fee%,merchant.ilike.%charge%,merchant.ilike.%commission%,notes.ilike.%fee%",
      );

    const transactions = (rows ?? []) as any[];
    const totalFees = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      feeTransactions: transactions || [],
      totalFeesZAR: totalFees,
      insight:
        totalFees > 200
          ? "Your bank fees are high. Consider a digital bank like TymeBank or Discovery."
          : "Your bank fees are within a healthy range.",
    };
  });
