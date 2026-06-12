import { useMemo, useState } from "react";
import { Calculator, TrendingUp, Sparkles } from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

type Idea = { ticker?: string; title?: string; potentialUpside?: string; riskLevel?: string };

function parseUpside(s?: string): number {
  if (!s) return 10;
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  if (m) return (parseFloat(m[1]) + parseFloat(m[2])) / 2;
  const single = s.match(/(-?\d+(?:\.\d+)?)/);
  return single ? parseFloat(single[1]) : 10;
}

function project(initial: number, monthly: number, years: number, annualRate: number) {
  // monthly compounding with end-of-month DCA
  const r = annualRate / 100 / 12;
  const series: { month: number; year: number; value: number }[] = [];
  let value = initial;
  series.push({ month: 0, year: 0, value });
  const months = Math.max(1, Math.round(years * 12));
  for (let m = 1; m <= months; m++) {
    value = value * (1 + r) + monthly;
    if (m % 3 === 0 || m === months) {
      series.push({ month: m, year: +(m / 12).toFixed(2), value: Math.round(value) });
    }
  }
  return { final: Math.round(value), series };
}

const fmt = (n: number, ccy = "ZAR") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n || 0);

export function ProfitCalculator({ ideas, defaultCcy = "ZAR" }: { ideas?: Idea[]; defaultCcy?: string }) {
  const [initial, setInitial] = useState(100);
  const [monthly, setMonthly] = useState(0);
  const [years, setYears] = useState(5);
  const [ticker, setTicker] = useState<string>("custom");
  const [baseRate, setBaseRate] = useState(10);

  const selectedIdea = ideas?.find((i) => i.ticker === ticker);

  // When ticker changes, hydrate base rate from idea upside
  const handleTicker = (t: string) => {
    setTicker(t);
    if (t !== "custom" && ideas) {
      const idea = ideas.find((i) => i.ticker === t);
      if (idea) setBaseRate(parseUpside(idea.potentialUpside));
    }
  };

  const scenarios = useMemo(() => {
    const bear = project(initial, monthly, years, baseRate * 0.4);
    const base = project(initial, monthly, years, baseRate);
    const bull = project(initial, monthly, years, baseRate * 1.6);
    // merge into one array by index
    const merged = base.series.map((p, i) => ({
      year: p.year,
      bear: bear.series[i]?.value ?? p.value,
      base: p.value,
      bull: bull.series[i]?.value ?? p.value,
    }));
    return { bear, base, bull, merged };
  }, [initial, monthly, years, baseRate]);

  const invested = initial + monthly * years * 12;
  const profitBase = scenarios.base.final - invested;
  const ccy = defaultCcy;

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute inset-0 opacity-25 pointer-events-none"
        style={{ background: "radial-gradient(70% 60% at 100% 0%, var(--color-primary), transparent 60%)" }} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="size-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">Profit Forecast Calculator</div>
            <div className="text-[11px] text-muted-foreground">If you invest now, how much could it grow to?</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-3 mb-4">
          <Labeled label="Idea / Ticker" cls="lg:col-span-2">
            <select
              value={ticker}
              onChange={(e) => handleTicker(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="custom">Custom rate</option>
              {(ideas ?? []).map((i, idx) => (
                <option key={idx} value={i.ticker ?? i.title ?? `idea-${idx}`}>
                  {i.ticker ? `${i.ticker} — ` : ""}{i.title} · {i.potentialUpside}
                </option>
              ))}
            </select>
          </Labeled>
          <Labeled label="Initial amount">
            <input type="number" min={0} value={initial} onChange={(e) => setInitial(Number(e.target.value) || 0)}
              className="w-full h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
          </Labeled>
          <Labeled label="Monthly (DCA)">
            <input type="number" min={0} value={monthly} onChange={(e) => setMonthly(Number(e.target.value) || 0)}
              className="w-full h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
          </Labeled>
          <Labeled label="Expected annual return (%)">
            <input type="number" value={baseRate} step={0.5}
              onChange={(e) => setBaseRate(Number(e.target.value) || 0)}
              className="w-full h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring" />
          </Labeled>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Time horizon</span>
            <span className="font-medium text-foreground">{years} {years === 1 ? "year" : "years"}</span>
          </div>
          <input
            type="range" min={1} max={30} value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="w-full accent-[var(--color-primary)]"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>1y</span><span>10y</span><span>20y</span><span>30y</span></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <Stat label="Total invested" value={fmt(invested, ccy)} />
          <Stat label="Projected value" value={fmt(scenarios.base.final, ccy)} accent="text-primary" />
          <Stat label="Projected profit" value={fmt(profitBase, ccy)} accent={profitBase >= 0 ? "text-success" : "text-destructive"} />
          <Stat label="Multiplier" value={invested > 0 ? `${(scenarios.base.final / invested).toFixed(2)}x` : "—"} />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <Scenario tone="rose"   label="Bear"  value={fmt(scenarios.bear.final, ccy)} rate={baseRate * 0.4} />
          <Scenario tone="blue"   label="Base"  value={fmt(scenarios.base.final, ccy)} rate={baseRate} />
          <Scenario tone="emerald" label="Bull" value={fmt(scenarios.bull.final, ccy)} rate={baseRate * 1.6} />
        </div>

        <div className="h-64">
          <ResponsiveContainer>
            <AreaChart data={scenarios.merged}>
              <defs>
                <linearGradient id="bullG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="baseG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="bearG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${v}y`} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickFormatter={(v) => `${Math.round(Number(v) / 1000)}k`} />
              <Tooltip
                contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                formatter={(v: number, k: string) => [fmt(Number(v), ccy), k]}
                labelFormatter={(l) => `Year ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="bull" stroke="#10B981" strokeWidth={2} fill="url(#bullG)" />
              <Area type="monotone" dataKey="base" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#baseG)" />
              <Area type="monotone" dataKey="bear" stroke="#EF4444" strokeWidth={2} fill="url(#bearG)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {selectedIdea && (
          <div className="mt-3 text-[11px] text-muted-foreground italic flex items-start gap-1.5">
            <Sparkles className="size-3 text-primary mt-0.5 shrink-0" />
            <span>Rate seeded from AI estimate for <b className="text-foreground">{selectedIdea.ticker}</b> · {selectedIdea.riskLevel} risk. Adjust expected return for your own assumptions.</span>
          </div>
        )}
        <div className="mt-2 text-[10px] text-muted-foreground">
          Educational projections only. Past performance does not guarantee future results.
        </div>
      </div>
    </div>
  );
}

function Labeled({ label, children, cls = "" }: { label: string; children: React.ReactNode; cls?: string }) {
  return (
    <label className={`block ${cls}`}>
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
function Stat({ label, value, accent = "" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold tabular-nums mt-0.5 ${accent}`}>{value}</div>
    </div>
  );
}
function Scenario({ tone, label, value, rate }: { tone: "rose"|"blue"|"emerald"; label: string; value: string; rate: number }) {
  const tones: Record<string, string> = {
    rose: "border-rose-500/30 bg-rose-500/5",
    blue: "border-primary/30 bg-primary/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
  };
  const dot: Record<string, string> = {
    rose: "bg-rose-500", blue: "bg-primary", emerald: "bg-emerald-500",
  };
  return (
    <div className={`rounded-lg border ${tones[tone]} p-2.5`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className={`size-1.5 rounded-full ${dot[tone]}`} /> {label} · {rate.toFixed(1)}%/yr
      </div>
      <div className="text-base font-bold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}

export default ProfitCalculator;
