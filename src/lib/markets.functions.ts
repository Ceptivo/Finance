import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiPrompt, parseJsonReply } from "./ai.server";
import { requirePremium } from "./premium.server";
import { getQuote, getQuotes, getHistory, getNews } from "./market-data.server";

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
      symbol: string;
      label: string;
      category: string;
      custom?: boolean;
      invested?: number;
      baseline?: number | null;
      customId?: string;
    }> = [];
    for (const d of DEFAULT_SYMBOLS) {
      all.push(d);
      seen.add(d.symbol);
    }
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
      error:
        quotes.length === 0 ? "No quotes returned — markets may be unreachable. Try again." : null,
      fetchedAt: new Date().toISOString(),
    };
  });

/* ---------------- Price history for charts ---------------- */

export const getMarketHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        symbol: z.string().min(1).max(40),
        range: z.enum(["1mo", "3mo", "6mo", "1y", "5y"]).default("1y"),
      })
      .parse(d),
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
      supabase
        .from("portfolio_holdings" as never)
        .select("*")
        .eq("user_id", userId),
      supabase
        .from("custom_markets" as never)
        .select("*")
        .eq("user_id", userId),
    ]);

    type Series = { weightAtT: (price: number) => number; points: { t: number; c: number }[] };
    const series: Series[] = [];
    let flatValue = 0;

    // Fetch all symbol histories in parallel, then assemble.
    const holdingRows = (holdings ?? []) as any[];
    const customRows2 = (customs ?? []) as any[];
    const [holdingHistories, customHistories] = await Promise.all([
      Promise.all(
        holdingRows.map((h) => {
          const qty = Number(h.quantity) || 0;
          const symbol = (h.symbol ?? "").trim();
          return symbol && qty > 0 ? getHistory(symbol, data.range) : Promise.resolve([]);
        }),
      ),
      Promise.all(
        customRows2.map((c) => {
          const invested = Number(c.invested_amount) || 0;
          const baseline = Number(c.baseline_price) || 0;
          return invested > 0 && baseline > 0 && c.symbol
            ? getHistory(c.symbol, data.range)
            : Promise.resolve([]);
        }),
      ),
    ]);

    holdingRows.forEach((h, i) => {
      const qty = Number(h.quantity) || 0;
      const points = holdingHistories[i];
      if (points.length > 1 && qty > 0) {
        series.push({ weightAtT: (p) => qty * p, points });
      } else {
        flatValue += Number(h.current_value) || 0;
      }
    });

    customRows2.forEach((c, i) => {
      const invested = Number(c.invested_amount) || 0;
      const baseline = Number(c.baseline_price) || 0;
      const points = customHistories[i];
      if (points.length > 1 && invested > 0 && baseline > 0) {
        series.push({ weightAtT: (p) => invested * (p / baseline), points });
      } else {
        flatValue += invested;
      }
    });

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
      return {
        date: new Date(t * 1000).toISOString().slice(0, 10),
        value: Math.round(total * 100) / 100,
      };
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

    const rows = ((holdings ?? []) as any[]).filter(
      (h) => (h.symbol ?? "").trim() && (Number(h.quantity) || 0) > 0,
    );
    const results = await Promise.all(
      rows.map(async (h) => {
        const q = await getQuote(h.symbol.trim());
        if (!q) return false;
        const { error } = await supabase
          .from("portfolio_holdings" as never)
          .update({
            current_value: Math.round((Number(h.quantity) || 0) * q.price * 100) / 100,
          } as never)
          .eq("id", h.id)
          .eq("user_id", userId);
        return !error;
      }),
    );
    return { updated: results.filter(Boolean).length };
  });

/* ---------------- AI investment ideas (Claude) ---------------- */

export const getInvestmentIdeas = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ riskTolerance: z.string().max(40).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requirePremium(context.supabase, context.userId, context.claims as any);
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

    const text = await aiPrompt(prompt, undefined, undefined, context.userId);
    let parsed: any;
    try {
      parsed = parseJsonReply(text);
    } catch {
      parsed = { ideas: [], marketContext: "AI response could not be parsed. Try refreshing." };
    }
    return { ...parsed, generatedAt: new Date().toISOString() };
  });

/* ---------------- Market sentiment ("the vibe") ---------------- */

const sentimentCache = new Map<string, { at: number; value: unknown }>();

/**
 * AI sentiment score for a symbol from recent news headlines.
 * Confidence threshold: below 85 the UI shows "still analyzing" instead of
 * a recommendation — sentiment is context, never a crystal ball.
 */
export const getMarketSentiment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ symbol: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    await requirePremium(context.supabase, context.userId, (context as any).claims);

    const symbol = data.symbol.toUpperCase();
    const hit = sentimentCache.get(symbol);
    if (hit && Date.now() - hit.at < 30 * 60_000) return hit.value as any;

    const [news, quote] = await Promise.all([getNews(symbol), getQuote(symbol)]);
    if (news.length < 3) {
      return {
        symbol,
        available: false,
        message: "Not enough recent news coverage to read the sentiment for this symbol.",
      };
    }

    const prompt = `You are a market sentiment analyst. Today is ${new Date().toISOString().slice(0, 10)}.
Symbol: ${symbol}${quote ? ` (price ${quote.price}, ${quote.changePct.toFixed(2)}% today)` : ""}

Recent headlines (newest first):
${news.map((n) => `- [${n.published}] ${n.title} (${n.publisher})`).join("\n")}

Score the crowd sentiment. Return STRICT minified JSON only:
{
 "score": number 0-100,           // 0 = extreme fear, 50 = neutral, 100 = extreme greed/hype
 "label": "Fearful"|"Cautious"|"Neutral"|"Optimistic"|"Greedy",
 "confidence": number 0-100,      // how confident you are given the evidence
 "summary": "2-3 sentences on WHY the sentiment is what it is",
 "signals": ["3-5 short bullet observations from the headlines"],
 "hypeWarning": boolean           // true ONLY if score >= 85 (peak-hype territory)
}
Educational context only — never financial advice.`;

    const text = await aiPrompt(prompt, undefined, undefined, context.userId);
    let parsed: any;
    try {
      parsed = parseJsonReply(text);
    } catch {
      return { symbol, available: false, message: "Sentiment analysis failed — try again." };
    }

    const confidence = Math.max(0, Math.min(100, Number(parsed.confidence) || 0));
    const result = {
      symbol,
      available: true,
      score: Math.max(0, Math.min(100, Number(parsed.score) || 50)),
      label: String(parsed.label ?? "Neutral"),
      confidence,
      // Below the 85% confidence threshold we ship the analysis but no stance.
      confident: confidence >= 85,
      summary: String(parsed.summary ?? ""),
      signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 6).map(String) : [],
      hypeWarning: !!parsed.hypeWarning && (Number(parsed.score) || 0) >= 85,
      headlineCount: news.length,
      generatedAt: new Date().toISOString(),
    };
    sentimentCache.set(symbol, { at: Date.now(), value: result });
    if (sentimentCache.size > 200) sentimentCache.clear();
    return result;
  });
