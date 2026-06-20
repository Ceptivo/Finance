import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

type FinnhubMatch = { symbol: string; description: string; displaySymbol: string; type: string };

/** Search Finnhub for symbol matches (stocks, ETFs, crypto, forex). */
export const searchSymbols = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().min(1).max(60) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.FINNHUB_API_KEY;
    if (!key) return { matches: [] as FinnhubMatch[], error: "Finnhub API key not configured." };
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/search?q=${encodeURIComponent(data.query)}&token=${key}`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) return { matches: [], error: `Search failed (${res.status})` };
      const j = (await res.json()) as { result?: FinnhubMatch[] };
      const matches = (j.result ?? []).slice(0, 20);
      return { matches, error: null };
    } catch (e: any) {
      return { matches: [] as FinnhubMatch[], error: e?.message ?? "Search failed" };
    }
  });

export const listCustomMarkets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("custom_markets" as never)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { items: (data ?? []) as any[] };
  });

export const addCustomMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      symbol: z.string().min(1).max(40),
      label: z.string().min(1).max(120),
      category: z.string().max(40).optional(),
      invested_amount: z.number().min(0).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Fetch baseline price now so we can compute value-of-investment later
    const key = process.env.FINNHUB_API_KEY;
    let baseline: number | null = null;
    if (key) {
      try {
        const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(data.symbol)}&token=${key}`, { signal: AbortSignal.timeout(8000) });
        if (r.ok) {
          const j = (await r.json()) as { c?: number };
          if (j?.c && j.c > 0) baseline = j.c;
        }
      } catch { /* ignore */ }
    }
    const { error } = await supabase
      .from("custom_markets" as never)
      .upsert({
        user_id: userId,
        symbol: data.symbol.toUpperCase(),
        label: data.label,
        category: data.category ?? "Custom",
        invested_amount: data.invested_amount ?? 0,
        baseline_price: baseline,
      } as never, { onConflict: "user_id,symbol" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCustomMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      invested_amount: z.number().min(0).optional(),
      label: z.string().min(1).max(120).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const patch: any = {};
    if (data.invested_amount !== undefined) patch.invested_amount = data.invested_amount;
    if (data.label !== undefined) patch.label = data.label;
    const { error } = await supabase
      .from("custom_markets" as never)
      .update(patch as never)
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCustomMarket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("custom_markets" as never)
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
