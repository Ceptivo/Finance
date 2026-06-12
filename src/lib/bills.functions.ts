import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listUpcomingBills = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: bills } = await supabase
      .from("recurring_bills" as never)
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    // Next occurrence of each bill's due_day, handling month rollover
    // (e.g. today is the 28th, bill due on the 2nd of next month).
    const today = new Date();
    const nextDue = (dueDay: number): Date => {
      const d = new Date(today.getFullYear(), today.getMonth(), dueDay);
      if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        return new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      }
      return d;
    };
    const horizon = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);

    const upcoming = (bills || [])
      .map((b: any) => ({ ...b, next_due: nextDue(Number(b.due_day)).toISOString().slice(0, 10) }))
      .filter((b: any) => new Date(b.next_due) <= horizon)
      .sort((a: any, b: any) => a.next_due.localeCompare(b.next_due));

    const totalUpcoming = upcoming.reduce((sum: number, b: any) => sum + Number(b.amount), 0);

    return {
      bills: bills || [],
      upcoming,
      totalUpcomingZAR: totalUpcoming,
    };
  });

export const addRecurringBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1),
        amount: z.number().positive(),
        due_day: z.number().int().min(1).max(31),
        category: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("recurring_bills" as never)
      .insert({ ...data, user_id: userId } as never);

    if (error) throw new Error(error.message);
    return { ok: true };
  });
