// Server-only market data layer. Primary source is Yahoo Finance's public
// chart/search endpoints (no API key required); Finnhub is used as a fallback
// when FINNHUB_API_KEY is set. Results are cached in-memory per instance.

export interface MarketQuote {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  prevClose: number;
  currency?: string;
  name?: string;
}

export interface HistoryPoint {
  t: number; // unix seconds
  c: number; // close
}

export interface SymbolMatch {
  symbol: string;
  description: string;
  displaySymbol: string;
  type: string;
}

const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) PersonalFinanceHub/1.0" };

/* ---------------- In-memory TTL cache ---------------- */

const cache = new Map<string, { at: number; value: unknown }>();
function cached<T>(key: string, ttlMs: number): T | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  return null;
}
function store(key: string, value: unknown) {
  cache.set(key, { at: Date.now(), value });
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 100);
    for (const [k] of oldest) cache.delete(k);
  }
}

/* ---------------- Yahoo Finance ---------------- */

interface YahooChart {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        chartPreviousClose?: number;
        previousClose?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        currency?: string;
        shortName?: string;
        longName?: string;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }> };
    }>;
    error?: { description?: string } | null;
  };
}

async function yahooChart(symbol: string, range: string, interval: string): Promise<YahooChart | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return (await res.json()) as YahooChart;
  } catch {
    return null;
  }
}

async function yahooQuote(symbol: string): Promise<MarketQuote | null> {
  const j = await yahooChart(symbol, "1d", "1d");
  const meta = j?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (price == null || price === 0) return null;
  const prev = meta?.chartPreviousClose ?? meta?.previousClose ?? price;
  return {
    symbol,
    price,
    change: price - prev,
    changePct: prev > 0 ? ((price - prev) / prev) * 100 : 0,
    high: meta?.regularMarketDayHigh ?? 0,
    low: meta?.regularMarketDayLow ?? 0,
    prevClose: prev,
    currency: meta?.currency,
    name: meta?.shortName ?? meta?.longName,
  };
}

async function finnhubQuote(symbol: string): Promise<MarketQuote | null> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key) return null;
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

/** Live quote for one symbol (60s cache). Tries Yahoo first, then Finnhub. */
export async function getQuote(symbol: string): Promise<MarketQuote | null> {
  const key = `q:${symbol}`;
  const hit = cached<MarketQuote | null>(key, 60_000);
  if (hit !== null) return hit;
  const quote = (await yahooQuote(symbol)) ?? (await finnhubQuote(symbol));
  if (quote) store(key, quote);
  return quote;
}

/** Quotes for many symbols in parallel. */
export async function getQuotes(symbols: string[]): Promise<Map<string, MarketQuote>> {
  const out = new Map<string, MarketQuote>();
  const results = await Promise.all(symbols.map((s) => getQuote(s)));
  results.forEach((q, i) => {
    if (q) out.set(symbols[i], q);
  });
  return out;
}

/** Daily/weekly close history for a symbol (10 min cache). */
export async function getHistory(
  symbol: string,
  range: "1mo" | "3mo" | "6mo" | "1y" | "5y" = "1y",
): Promise<HistoryPoint[]> {
  const key = `h:${symbol}:${range}`;
  const hit = cached<HistoryPoint[]>(key, 10 * 60_000);
  if (hit) return hit;

  const interval = range === "5y" ? "1wk" : range === "1y" ? "1wk" : "1d";
  const j = await yahooChart(symbol, range, interval);
  const result = j?.chart?.result?.[0];
  const ts = result?.timestamp ?? [];
  const closes = result?.indicators?.quote?.[0]?.close ?? [];
  const points: HistoryPoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i];
    if (c != null && Number.isFinite(c)) points.push({ t: ts[i], c });
  }
  if (points.length) store(key, points);
  return points;
}

/** Search symbols by name or ticker (Yahoo search, no key; 5 min cache). */
export async function searchMarketSymbols(query: string): Promise<SymbolMatch[]> {
  const key = `s:${query.toLowerCase()}`;
  const hit = cached<SymbolMatch[]>(key, 5 * 60_000);
  if (hit) return hit;
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=20&newsCount=0`;
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const j = (await res.json()) as {
      quotes?: Array<{ symbol?: string; shortname?: string; longname?: string; quoteType?: string; exchDisp?: string }>;
    };
    const matches: SymbolMatch[] = (j.quotes ?? [])
      .filter((q) => q.symbol)
      .map((q) => ({
        symbol: q.symbol!,
        description: q.shortname ?? q.longname ?? q.symbol!,
        displaySymbol: q.symbol!,
        type: [q.quoteType, q.exchDisp].filter(Boolean).join(" · "),
      }));
    store(key, matches);
    return matches;
  } catch {
    return [];
  }
}
