import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiPrompt, parseJsonReply } from "./ai.server";
import { getQuote, getQuotes, getHistory } from "./market-data.server";

/* ---------------- Live quotes (Yahoo Finance, no API key needed) ---------------- */

const DEFAULT_SYMBOLS: Array<{ symbol: string; label: string; category: string }> = [
  { symbol: "SPY", label: "S&P 500", category: "Index" },
  { symbol: "QQQ", label: "Nasdaq 100", category: "Index" },
  { symbol: "DIA", label: "Dow Jones", category: "Index" },
  { symbol: "IWM", label: "Russell 2000", category: "Index" },
  { symbol: "VTI", label: "US Total Market", category: "ETF" },
  { symbol: "VXUS", label: "International Stocks", category: "ETF" },
  { symbol: "GLD", label: "Gold", category: "Commodity" },
  { symbol: "BTC-USD", label: "Bitcoin", category: "Crypto" },
];

export const getLiveMarkets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: customRows } = await supabase
      .from("custom_markets" as never)
      .select("id,symbol,label,category,invested_amount,baseline_price")
      .eq("user_id", userId);
    const customs = (customRows ?? []) as any[];

    const seen = new Set<string>();
    const all: Array<{
      symbol: string; label: string; category: string;
      custom?: boolean; invested?: number; baseline?: number | null; customId?: string;
    }> = [];
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

    const quoteMap = await getQuotes(all.map((s) => s.symbol));
    const quotes = all
      .map((s) => {
        const q = quoteMap.get(s.symbol);
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
      })
      .filter((x): x is any => x !== null);

    return {
      quotes,
      error: quotes.length === 0 ? "No quotes returned — markets may be unreachable. Try again." : null,
      fetchedAt: new Date().toISOString(),
    };
  });

/* ---------------- Price history for charts ---------------- */

export const getMarketHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      symbol: z.string().min(1).max(40),
      range: z.enum(["1mo", "3mo", "6mo", "1y", "5y"]).default("1y"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const points = await getHistory(data.symbol, data.range);
    return { symbol: data.symbol, range: data.range, points };
  });

/**
 * Real portfolio value over time. Combines:
 *  - custom markets with invested amounts: invested × (price_t / baseline)
 *  - holdings with a known symbol and quantity: quantity × price_t
 *  - holdings without market data: flat at current_value
 */
export const getPortfolioHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ range: z.enum(["1mo", "3mo", "6mo", "1y", "5y"]).default("1y") }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ data: holdings }, { data: customs }] = await Promise.all([
      supabase.from("portfolio_holdings" as never).select("*").eq("user_id", userId),
      supabase.from("custom_markets" as never).select("*").eq("user_id", userId),
    ]);

    type Series = { weightAtT: (price: number) => number; points: { t: number; c: number }[] };
    const series: Series[] = [];
    let flatValue = 0;

    for (const h of (holdings ?? []) as any[]) {
      const qty = Number(h.quantity) || 0;
      const symbol = (h.symbol ?? "").trim();
      if (symbol && qty > 0) {
        const points = await getHistory(symbol, data.range);
        if (points.length > 1) {
          series.push({ weightAtT: (p) => qty * p, points });
          continue;
        }
      }
      flatValue += Number(h.current_value) || 0;
    }

    for (const c of (customs ?? []) as any[]) {
      const invested = Number(c.invested_amount) || 0;
      const baseline = Number(c.baseline_price) || 0;
      if (invested > 0 && baseline > 0 && c.symbol) {
        const points = await getHistory(c.symbol, data.range);
        if (points.length > 1) {
          series.push({ weightAtT: (p) => invested * (p / baseline), points });
          continue;
        }
      }
      flatValue += invested;
    }

    if (series.length === 0) {
      return { points: [] as { date: string; value: number }[], flatValue };
    }

    // Align on the longest series' timestamps; for each series use the latest
    // close at or before each timestamp.
    const master = series.reduce((a, b) => (a.points.length >= b.points.length ? a : b)).points;
    const points = master.map(({ t }) => {
      let total = flatValue;
      for (const s of series) {
        let close = s.points[0].c;
        for (const p of s.points) {
          if (p.t <= t) close = p.c;
          else break;
        }
        total += s.weightAtT(close);
      }
      return { date: new Date(t * 1000).toISOString().slice(0, 10), value: Math.round(total * 100) / 100 };
    });

    return { points, flatValue };
  });

/* ---------------- Refresh holding values from live prices ---------------- */

export const refreshHoldingValues = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: holdings } = await supabase
      .from("portfolio_holdings" as never)
      .select("id,symbol,quantity")
      .eq("user_id", userId);

    let updated = 0;
    for (const h of (holdings ?? []) as any[]) {
      const qty = Number(h.quantity) || 0;
      const symbol = (h.symbol ?? "").trim();
      if (!symbol || qty <= 0) continue;
      const q = await getQuote(symbol);
      if (!q) continue;
      const { error } = await supabase
        .from("portfolio_holdings" as never)
        .update({ current_value: Math.round(qty * q.price * 100) / 100 } as never)
        .eq("id", h.id)
        .eq("user_id", userId);
      if (!error) updated++;
    }
    return { updated };
  });

/* ---------------- AI investment ideas (Claude) ---------------- */

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

    const text = await aiPrompt(prompt);
    let parsed: any;
    try {
      parsed = parseJsonReply(text);
    } catch {
      parsed = { ideas: [], marketContext: "AI response could not be parsed. Try refreshing." };
    }
    return { ...parsed, generatedAt: new Date().toISOString() };
  });
