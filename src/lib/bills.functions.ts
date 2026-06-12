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

    const today = new Date();
    const currentDay = today.getDate();
    
    // Logic to find bills due in the next 7 days
    const upcoming = (bills || []).filter(bill => {
      const dueDay = Number(bill.due_day);
      if (dueDay >= currentDay && dueDay <= currentDay + 7) return true;
      return false;
    });

    const totalUpcoming = upcoming.reduce((sum, b) => sum + Number(bill.amount), 0);

    return { 
      bills: bills || [], 
      upcoming, 
      totalUpcomingZAR: totalUpcoming 
    };
  });

export const addRecurringBill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    name: z.string().min(1),
    amount: z.number().positive(),
    due_day: z.number().int().min(1).max(31),
    category: z.string().optional()
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("recurring_bills" as never)
      .insert({ ...data, user_id: userId } as never);
    
    if (error) throw new Error(error.message);
    return { ok: true };
  });
