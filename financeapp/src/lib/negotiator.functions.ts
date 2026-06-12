import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)("google/gemini-3-flash-preview");
}

export interface NegotiationOpportunity {
  category: string;
  name: string;
  currentCost: number;
  estimatedSavings: number;
  reasoning: string;
  emailDraft: string;
}

export const analyzeNegotiationOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => {
    const data = d as { subscriptions: any[]; topExpenses: any[] };
    return data;
  })
  .handler(async ({ data }) => {
    const { subscriptions, topExpenses } = data;

    const prompt = `You are a South African personal finance advisor helping a user identify cost-saving opportunities and negotiate better deals.

SUBSCRIPTIONS:
${subscriptions.map((s: any) => `- ${s.name} (${s.category}): R${s.monthlyCost}/month`).join("\n")}

TOP RECURRING EXPENSES (last 3 months average):
${topExpenses.map((e: any) => `- ${e.category}: R${e.avgMonthly}/month`).join("\n")}

Identify up to 4 specific opportunities where the user could:
1. Negotiate a lower price with their current provider
2. Switch to a cheaper alternative
3. Bundle services for a discount
4. Cancel and re-subscribe at a promotional rate

For each opportunity, provide a JSON array with this exact structure:
[
  {
    "category": "string (e.g. Cell Phone, Insurance, Internet)",
    "name": "string (specific service name)",
    "currentCost": number (monthly in ZAR),
    "estimatedSavings": number (monthly ZAR savings possible),
    "reasoning": "string (2-3 sentence explanation, mention specific South African providers when relevant e.g. Vodacom, MTN, Telkom, Discovery, OUTsurance)",
    "emailDraft": "string (a professional negotiation email the user can send directly to the provider, personalised and firm but polite, mention competitor pricing)"
  }
]

Return ONLY valid JSON array, no markdown or explanation.`;

    try {
      const { text } = await generateText({
        model: getModel(),
        messages: [{ role: "user", content: prompt }],
      });

      // Parse the JSON response
      const cleaned = text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
      const opportunities: NegotiationOpportunity[] = JSON.parse(cleaned);
      return { opportunities };
    } catch {
      return { opportunities: [] as NegotiationOpportunity[] };
    }
  });
