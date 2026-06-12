import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { getMarketSentiment } from "@/lib/markets.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gauge, Loader2, AlertTriangle, Newspaper } from "lucide-react";
import { toast } from "sonner";

/** AI "vibe check": news-driven sentiment with a hard confidence threshold. */
export function SentimentCard({ defaultSymbol = "" }: { defaultSymbol?: string }) {
  const [symbol, setSymbol] = useState(defaultSymbol);
  const fn = useServerFn(getMarketSentiment);

  const run = useMutation({
    mutationFn: (s: string) => fn({ data: { symbol: s } }),
    onError: (e: Error) => toast.error(e.message),
  });
  const r: any = run.data;

  const gaugeColor = (score: number) =>
    score >= 85
      ? "text-rose-400"
      : score >= 65
        ? "text-amber-400"
        : score >= 35
          ? "text-sky-400"
          : "text-emerald-400";

  return (
    <div className="glass rounded-2xl p-5 shadow-elegant border border-primary/20">
      <div className="flex items-center gap-3 mb-1">
        <div className="size-9 rounded-xl gradient-primary grid place-items-center shadow-glow">
          <Gauge className="size-4 text-primary-foreground" />
        </div>
        <div>
          <h3 className="font-semibold leading-tight">Market Sentiment</h3>
          <p className="text-xs text-muted-foreground">
            AI reads recent news and scores the crowd's mood
          </p>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && symbol.trim() && run.mutate(symbol.trim())}
          placeholder="Ticker, e.g. TSLA, NVDA, BTC-USD"
          className="uppercase"
        />
        <Button
          onClick={() => symbol.trim() && run.mutate(symbol.trim())}
          disabled={run.isPending || !symbol.trim()}
          className="gradient-primary text-primary-foreground border-0 shadow-glow shrink-0"
        >
          {run.isPending ? <Loader2 className="size-4 animate-spin" /> : "Read the vibe"}
        </Button>
      </div>

      {r && !r.available && <p className="mt-4 text-sm text-muted-foreground">{r.message}</p>}

      {r?.available && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className={`text-4xl font-bold tabular-nums ${gaugeColor(r.score)}`}>
              {r.score}
            </div>
            <div>
              <div className="font-semibold">{r.label}</div>
              <div className="text-xs text-muted-foreground">
                0 = fear · 100 = greed · from {r.headlineCount} headlines
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-muted-foreground">AI confidence</div>
              <div
                className={`font-semibold ${r.confident ? "text-emerald-400" : "text-amber-400"}`}
              >
                {r.confidence}%
              </div>
            </div>
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${r.score}%`,
                background: "linear-gradient(90deg, #34d399, #38bdf8, #fbbf24, #fb7185)",
              }}
            />
          </div>

          {!r.confident && (
            <div className="rounded-xl bg-sky-500/10 border border-sky-500/30 px-3 py-2.5 text-xs text-muted-foreground">
              I'm still analyzing the data — confidence is below 85%, so no recommendation yet.
              Treat the score as context only.
            </div>
          )}

          {r.hypeWarning && r.confident && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/40 px-3 py-2.5 text-sm flex items-start gap-2">
              <AlertTriangle className="size-4 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <span className="font-semibold text-rose-300">Peak-hype warning: </span>
                the crowd is {r.score}% greedy on {r.symbol}. Historically, extreme hype often
                precedes pullbacks — consider whether it's time to take profits.
              </span>
            </div>
          )}

          <p className="text-sm leading-relaxed">{r.summary}</p>

          {r.signals?.length > 0 && (
            <ul className="space-y-1.5">
              {r.signals.map((sig: string) => (
                <li key={sig} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Newspaper className="size-3.5 shrink-0 mt-0.5" />
                  {sig}
                </li>
              ))}
            </ul>
          )}

          <p className="text-[11px] text-muted-foreground">
            Sentiment is context, not a crystal ball — never a trade instruction.
          </p>
        </div>
      )}
    </div>
  );
}
