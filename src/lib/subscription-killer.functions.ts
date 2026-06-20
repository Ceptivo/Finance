import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiPrompt, parseJsonReply } from "./ai.server";
import { requirePremium } from "./premium.server";

/** AI audit: find likely "zombie" subscriptions worth cancelling. */
export const auditSubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePremium(supabase, userId, (context as any).claims);

    const [{ data: subs }, { data: expenses }] = await Promise.all([
      supabase
        .from("subscriptions" as never)
        .select("*")
        .eq("user_id", userId),
      supabase
        .from("expenses" as never)
        .select("merchant,category,amount,occurred_on")
        .eq("user_id", userId)
        .gte("occurred_on", new Date(Date.now() - 120 * 86400_000).toISOString().slice(0, 10))
        .limit(1000),
    ]);
    if (!subs?.length) throw new Error("No subscriptions to audit yet.");

    const prompt = `You are a ruthless subscription auditor. Today is ${new Date().toISOString().slice(0, 10)}.

SUBSCRIPTIONS: ${JSON.stringify(subs)}
LAST 120 DAYS OF EXPENSES: ${JSON.stringify((expenses ?? []).slice(0, 500))}

Identify zombie subscriptions (overlapping services, duplicates, poor value,
suspiciously unused). Return STRICT minified JSON:
{
 "verdicts": [
   { "name": string,                       // exact subscription name
     "verdict": "keep" | "review" | "cancel",
     "reason": "1 sentence, specific",
     "monthlySaving": number }             // 0 if keep
 ],
 "totalMonthlySaving": number,
 "summary": "1-2 sentence overall verdict"
}`;

    const text = await aiPrompt(prompt, undefined, undefined, userId);
    try {
      return { ...parseJsonReply<any>(text), generatedAt: new Date().toISOString() };
    } catch {
      throw new Error("Audit failed to parse — try again.");
    }
  });

/** "AI, cancel this": generate a cancellation email + step-by-step path. */
export const cancelAssist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ name: z.string().min(1).max(120), amount: z.number().min(0).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePremium(context.supabase, context.userId, (context as any).claims);

    const prompt = `Help a user cancel the subscription "${data.name}"${data.amount ? ` (≈${data.amount}/month)` : ""}.
Return STRICT minified JSON:
{
 "emailSubject": "ready-to-send cancellation email subject",
 "emailBody": "polite, firm cancellation email body (no placeholders the user must fill except [Your Name]; cite consumer right to cancel)",
 "steps": ["3-6 concrete steps to cancel this specific service (settings path, link hints, phone option)"],
 "unsubscribeHint": "where the cancel/unsubscribe option usually lives for this service, or general guidance"
}`;

    const text = await aiPrompt(prompt, undefined, undefined, context.userId);
    try {
      return parseJsonReply<any>(text);
    } catch {
      throw new Error("Could not generate cancellation help — try again.");
    }
  });
