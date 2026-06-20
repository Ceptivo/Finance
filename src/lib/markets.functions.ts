import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

/* ---------------- Finnhub live quotes ---------------- */

type Quote = {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  prevClose: number;
};

const DEFAULT_SYMBOLS: Array<{ symbol: string; label: string; category: string }> = [
  { symbol: "SPY", label: "S&P 500", category: "Index" },
  { symbol: "QQQ", label: "Nasdaq 100", category: "Index" },
  { symbol: "DIA", label: "Dow Jones", category: "Index" },
  { symbol: "IWM", label: "Russell 2000", category: "Index" },
  { symbol: "VTI", label: "US Total Market", category: "ETF" },
  { symbol: "VXUS", label: "International Stocks", category: "ETF" },
  { symbol: "GLD", label: "Gold", category: "Commodity" },
  { symbol: "TLT", label: "20Y Treasuries", category: "Bond" },
];

async function fetchQuote(symbol: string, key: string): Promise<Omit<Quote, "label"> | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const j = (await res.json()) as { c: number; d: number; dp: number; h: number; l: number; pc: number };
    if (!j || typeof j.c !== "number" || j.c === 0) return null;
    return {
      symbol,
      price: j.c,
      change: j.d ?? 0,
      changePct: j.dp ?? 0,
      high: j.h ?? 0,
      low: j.l ?? 0,
      prevClose: j.pc ?? 0,
    };
  } catch {
    return null;
  }
}

export const getLiveMarkets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) {
      return {
        quotes: [] as Array<Quote & { category: string; custom?: boolean; invested?: number; valueNow?: number; pl?: number; plPct?: number; baseline?: number; customId?: string }>,
        error: "Finnhub API key not configured.",
        fetchedAt: new Date().toISOString(),
      };
    }

    const { supabase, userId } = context;
    const { data: customRows } = await supabase
      .from("custom_markets" as never)
      .select("id,symbol,label,category,invested_amount,baseline_price")
      .eq("user_id", userId);
    const customs = (customRows ?? []) as any[];

    const seen = new Set<string>();
    const all: Array<{ symbol: string; label: string; category: string; custom?: boolean; invested?: number; baseline?: number | null; customId?: string }> = [];
    for (const d of DEFAULT_SYMBOLS) { all.push(d); seen.add(d.symbol); }
    for (const c of customs) {
      if (seen.has(c.symbol)) continue;
      seen.add(c.symbol);
      all.push({
        symbol: c.symbol,
        label: c.label,
        category: c.category || "Custom",
        custom: true,
        invested: Number(c.invested_amount) || 0,
        baseline: c.baseline_price != null ? Number(c.baseline_price) : null,
        customId: c.id,
      });
    }

    const settled = await Promise.all(
      all.map(async (s) => {
        const q = await fetchQuote(s.symbol, key);
        if (!q) return null;
        const enriched: any = { ...q, label: s.label, category: s.category };
        if (s.custom) {
          enriched.custom = true;
          enriched.customId = s.customId;
          enriched.invested = s.invested ?? 0;
          const base = s.baseline ?? q.prevClose ?? q.price;
          enriched.baseline = base;
          if (base > 0 && enriched.invested > 0) {
            enriched.valueNow = enriched.invested * (q.price / base);
            enriched.pl = enriched.valueNow - enriched.invested;
            enriched.plPct = ((q.price - base) / base) * 100;
          }
        }
        return enriched;
      }),
    );

    const quotes = settled.filter((x): x is any => x !== null);
    return {
      quotes,
      error: quotes.length === 0 ? "No quotes returned. Check API key or try again." : null,
      fetchedAt: new Date().toISOString(),
    };
  });

/* ---------------- AI investment ideas ---------------- */

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return createLovableAiGatewayProvider(key)("google/gemini-2.5-flash");
}

export const getInvestmentIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ riskTolerance: z.string().max(40).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const risk = data.riskTolerance || "Moderate";
    const today = new Date().toISOString().slice(0, 10);

    const prompt = `You are an educational investment research analyst. Today is ${today}.
Generate 5 timely market opportunity ideas suitable for a ${risk}-risk retail investor.

For each idea provide:
- title (short, punchy)
- ticker (real ticker symbol if applicable, otherwise an ETF or theme name)
- thesis (1-2 sentences explaining the opportunity, grounded in recent macro/structural themes such as AI infrastructure, rate cycles, energy transition, demographic shifts, etc.)
- potentialUpside (rough estimated 12-month return as a percentage range string like "8-15%")
- riskLevel ("Low" | "Moderate" | "High")
- timeHorizon (string like "6-12 months" or "3-5 years")

Return STRICT JSON only, no prose, no markdown fences:
{
  "ideas": [
    { "title": string, "ticker": string, "thesis": string, "potentialUpside": string, "riskLevel": string, "timeHorizon": string }
  ],
  "marketContext": string  // 1-2 sentence current macro context
}

Important: This is educational content only — never financial advice.`;

    const { text } = await generateText({
      model: getModel(),
      prompt,
    });

    let parsed: any;
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { ideas: [], marketContext: "AI response could not be parsed. Try refreshing." };
    }
    return { ...parsed, generatedAt: new Date().toISOString() };
  });
