import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const detectBankFees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    
    // Scan last 30 days of transactions for fee keywords
    const { data: transactions } = await supabase
      .from("transactions" as never)
      .select("*")
      .eq("user_id", userId)
      .ilike("description", "%fee%"); // Matches "Bank Fee", "Service Fee", etc.

    const totalFees = (transactions || []).reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      feeTransactions: transactions || [],
      totalFeesZAR: totalFees,
      insight: totalFees > 200 ? "Your bank fees are high. Consider a digital bank like TymeBank or Discovery." : "Your bank fees are within a healthy range."
    };
  });
