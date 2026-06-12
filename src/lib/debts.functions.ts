import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const DebtSchema = z.object({
  name: z.string().min(1),
  balance: z.number().min(0),
  interest_rate: z.number().min(0),
  minimum_payment: z.number().min(0),
});

export const saveDebt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DebtSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("debts" as never)
      .insert({ ...data, user_id: userId } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listDebts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("debts" as never)
      .select("*")
      .eq("user_id", context.userId);
    return { debts: data || [] };
  });

export const calculatePayoffPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ strategy: z.enum(["snowball", "avalanche"]), extraPayment: z.number() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: debts } = await supabase
      .from("debts" as never)
      .select("*")
      .eq("user_id", userId);

    const rows = (debts ?? []) as any[];
    if (rows.length === 0) return { schedule: [] };

    let sortedDebts = [...rows];
    if (data.strategy === "snowball") {
      sortedDebts.sort((a, b) => a.balance - b.balance);
    } else {
      sortedDebts.sort((a, b) => b.interest_rate - a.interest_rate);
    }

    let schedule = [];
    let currentDebts = sortedDebts.map((d) => ({ ...d, currentBalance: Number(d.balance) }));
    let month = 0;

    while (currentDebts.some((d) => d.currentBalance > 0) && month < 360) {
      month++;
      let totalExtra = data.extraPayment;
      let monthTotalInterest = 0;

      for (let debt of currentDebts) {
        if (debt.currentBalance <= 0) continue;
        let interest = (debt.currentBalance * (debt.interest_rate / 100)) / 12;
        monthTotalInterest += interest;
        debt.currentBalance += interest;
        let payment = Math.min(debt.currentBalance, debt.minimum_payment);
        debt.currentBalance -= payment;
      }

      for (let debt of currentDebts) {
        if (debt.currentBalance > 0) {
          let extra = Math.min(debt.currentBalance, totalExtra);
          debt.currentBalance -= extra;
          totalExtra -= extra;
          if (totalExtra <= 0) break;
        }
      }

      schedule.push({
        month,
        remaining: currentDebts.reduce((sum, d) => sum + d.currentBalance, 0),
        interestPaid: monthTotalInterest,
      });
    }

    return { schedule };
  });
