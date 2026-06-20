import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  TrendingUp, Wallet, PiggyBank, Target, Activity, Sparkles, MessageSquare,
  ShieldCheck, BarChart3, Plus, Trash2, Loader2, Send, RefreshCw, LineChart as LineChartIcon, Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import {
  getProfile, saveProfile, getInvestmentDashboard, generateStrategy,
  computeHealthScore, askAssistant, addGoal, deleteGoal, addHolding, deleteHolding,
} from "@/lib/investment.functions";
import { getLiveMarkets, getInvestmentIdeas, getPortfolioHistory, refreshHoldingValues } from "@/lib/markets.functions";
import { searchSymbols, listCustomMarkets, addCustomMarket, updateCustomMarket, deleteCustomMarket } from "@/lib/custom-markets.functions";
import { ProfitCalculator } from "@/components/ProfitCalculator";
import { SentimentCard } from "@/components/SentimentCard";

export const Route = createFileRoute("/investments")({
  component: InvestmentsPage,
});

const TABS = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "profile", label: "Profile", icon: ShieldCheck },
  { id: "strategy", label: "AI Strategy", icon: Sparkles },
  { id: "savings", label: "Savings", icon: PiggyBank },
  { id: "retirement", label: "Retirement", icon: LineChartIcon },
  { id: "goals", label: "Goals", icon: Target },
  { id: "market", label: "Market", icon: Activity },
  { id: "assistant", label: "AI Chat", icon: MessageSquare },
] as const;
type TabId = (typeof TABS)[number]["id"];

const fmt = (n: number, ccy = "ZAR") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n || 0);

function InvestmentsPage() {
  const [tab, setTab] = useState<TabId>("overview");
  const getDash = useServerFn(getInvestmentDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["inv-dash"], queryFn: () => getDash() });

  const ccy = (data?.profile as any)?.currency || "ZAR";

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Investment Hub"
        subtitle="Plan, track, and grow your investments with AI-powered insights."
      />

      <div className="glass rounded-xl p-1 flex gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm whitespace-nowrap transition-smooth ${
                active ? "gradient-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <Icon className="size-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="glass rounded-2xl p-12 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {tab === "overview" && <OverviewTab data={data} ccy={ccy} />}
          {tab === "profile" && <ProfileTab />}
          {tab === "strategy" && <StrategyTab recommendations={data?.recommendations ?? []} ccy={ccy} />}
          {tab === "savings" && <SavingsTab profile={data?.profile} ccy={ccy} />}
          {tab === "retirement" && <RetirementTab profile={data?.profile} ccy={ccy} />}
          {tab === "goals" && <GoalsTab goals={data?.goals ?? []} ccy={ccy} />}
          {tab === "market" && <MarketTab />}
          {tab === "assistant" && <AssistantTab />}
        </>
      )}

      <ComplianceBanner />
    </div>
  );
}

function ComplianceBanner() {
  return (
    <div className="glass rounded-xl p-3 text-xs text-muted-foreground border border-border">
      <span className="font-medium text-foreground">Educational use only.</span>{" "}
      This platform provides educational financial information and does not provide regulated financial advice. Consult a qualified financial professional before making investment decisions.
    </div>
  );
}

/* -------------------- OVERVIEW -------------------- */
function OverviewTab({ data, ccy }: { data: any; ccy: string }) {
  const holdings = data?.holdings ?? [];
  const profile = data?.profile ?? {};
  const totalInvested = holdings.reduce((s: number, h: any) => s + Number(h.cost_basis), 0);
  const currentValue = holdings.reduce((s: number, h: any) => s + Number(h.current_value), 0);
  const pl = currentValue - totalInvested;
  const totalSavings = Number(profile.emergency_fund) || 0;
  const monthly = Number(profile.monthly_savings) || 0;
  const netWorth = currentValue + totalSavings - (Number(profile.total_debt) || 0);

  const qc = useQueryClient();
  const computeFn = useServerFn(computeHealthScore);
  const compute = useMutation({
    mutationFn: () => computeFn(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inv-dash"] }); toast.success("Health score updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const score = data?.latestScore;

  // Real portfolio value over time, driven by live market history.
  const [range, setRange] = useState<"1mo" | "3mo" | "6mo" | "1y" | "5y">("1y");
  const historyFn = useServerFn(getPortfolioHistory);
  const historyQ = useQuery({
    queryKey: ["portfolio-history", range],
    queryFn: () => historyFn({ data: { range } }),
    staleTime: 5 * 60_000,
  });
  const trend = (historyQ.data?.points ?? []).map((p) => ({
    m: p.date.slice(5),
    value: p.value,
  }));

  const refreshFn = useServerFn(refreshHoldingValues);
  const refresh = useMutation({
    mutationFn: () => refreshFn(),
    onSuccess: (r: { updated: number }) => {
      qc.invalidateQueries({ queryKey: ["inv-dash"] });
      qc.invalidateQueries({ queryKey: ["portfolio-history"] });
      toast.success(
        r.updated > 0
          ? `Updated ${r.updated} holding${r.updated === 1 ? "" : "s"} from live prices`
          : "No holdings with a symbol + quantity to refresh",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Total Invested" value={fmt(totalInvested, ccy)} icon={Wallet} />
        <KpiCard label="Portfolio Value" value={fmt(currentValue, ccy)} icon={TrendingUp} delta={totalInvested ? (pl / totalInvested) * 100 : 0} />
        <KpiCard label="Profit / Loss" value={fmt(pl, ccy)} icon={Activity} />
        <KpiCard label="Total Savings" value={fmt(totalSavings, ccy)} icon={PiggyBank} />
        <KpiCard label="Monthly Contribution" value={fmt(monthly, ccy)} icon={RefreshCw} />
        <KpiCard label="Net Worth" value={fmt(netWorth, ccy)} icon={ShieldCheck} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <div>
              <div className="text-sm font-semibold">Portfolio Trend</div>
              <div className="text-xs text-muted-foreground">Live market history of your holdings</div>
            </div>
            <div className="flex items-center gap-1">
              {(["1mo", "3mo", "6mo", "1y", "5y"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2 py-1 rounded-md text-xs transition-smooth ${range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"}`}
                >
                  {r}
                </button>
              ))}
              <button
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending}
                title="Refresh holding values from live prices"
                className="ml-1 p-1.5 rounded-md text-muted-foreground hover:bg-accent disabled:opacity-50"
              >
                <RefreshCw className={`size-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
          <div className="h-64">
            {historyQ.isLoading ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Loading market history…</div>
            ) : trend.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground text-center px-6">
                Add holdings with a ticker symbol + quantity, or invested custom markets, to see your real portfolio trend.
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold">Financial Health</div>
            <button
              onClick={() => compute.mutate()}
              disabled={compute.isPending}
              className="text-xs inline-flex items-center gap-1 px-2 h-7 rounded-md bg-accent hover:bg-accent/80"
            >
              {compute.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              Recalculate
            </button>
          </div>
          {score ? (
            <div className="space-y-3">
              <div className="text-center py-2">
                <div className="text-5xl font-bold gradient-primary bg-clip-text text-transparent">{score.score}</div>
                <div className="text-xs text-muted-foreground mt-1">out of 100 · {score.risk_level} risk</div>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full gradient-primary" style={{ width: `${score.score}%` }} />
              </div>
              {(score.strengths ?? []).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-success mb-1">Strengths</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {(score.strengths as string[]).map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
              {(score.improvements ?? []).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-primary mb-1">Improvements</div>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    {(score.improvements as string[]).map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">
              Complete your profile, then recalculate to get your score.
            </div>
          )}
        </div>
      </div>

      <HoldingsCard holdings={holdings} ccy={ccy} />
      <AIInsightsPanel score={score} profile={profile} ccy={ccy} />
    </div>
  );
}

function AIInsightsPanel({ score, profile, ccy }: { score: any; profile: any; ccy: string }) {
  const insights: string[] = [];
  const sr = Number(profile?.monthly_income) > 0 ? (Number(profile?.monthly_savings) / Number(profile?.monthly_income)) * 100 : 0;
  if (sr > 0) insights.push(`Your current savings rate is ${sr.toFixed(0)}% of income.`);
  const ef = Number(profile?.emergency_fund) || 0;
  const target = (Number(profile?.monthly_expenses) || 0) * 6;
  if (target > 0) insights.push(`Your emergency fund is ${Math.min(100, Math.round((ef / target) * 100))}% complete (target ${fmt(target, ccy)}).`);
  if (score?.score >= 70) insights.push("Current interest rates favor balanced ETF + dividend allocations.");
  if ((Number(profile?.existing_investments) || 0) > 0)
    insights.push(`Adding ${fmt(500, ccy)}/mo to ETFs could meaningfully improve long-term projections.`);
  if (insights.length === 0) insights.push("Fill in your profile to unlock personalized insights.");

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="size-4 text-primary" />
        <div className="text-sm font-semibold">AI Insights</div>
      </div>
      <ul className="space-y-2 text-sm">
        {insights.map((i, idx) => (
          <li key={idx} className="flex gap-2"><span className="text-primary">›</span><span className="text-muted-foreground">{i}</span></li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------- PROFILE -------------------- */
function ProfileTab() {
  const qc = useQueryClient();
  const getFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveProfile);
  const { data } = useQuery({ queryKey: ["inv-profile"], queryFn: () => getFn() });
  const p = (data?.profile ?? {}) as any;

  const [form, setForm] = useState<any>({});
  const merged = { ...p, ...form };

  const save = useMutation({
    mutationFn: (d: any) => saveFn({ data: d }),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["inv-profile"] });
      qc.invalidateQueries({ queryKey: ["inv-dash"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const num = (k: string) => Number(merged[k] ?? 0);

  return (
    <div className="glass rounded-2xl p-6 space-y-5 max-w-3xl">
      <div>
        <div className="text-lg font-semibold">Investment Profile</div>
        <div className="text-sm text-muted-foreground">Tell us about your finances so we can personalize your strategy.</div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Age">
          <Input type="number" value={merged.age ?? ""} onChange={(v) => set("age", v ? Number(v) : null)} />
        </Field>
        <Field label="Country">
          <Input value={merged.country ?? ""} onChange={(v) => set("country", v)} placeholder="South Africa" />
        </Field>
        <Field label="Currency">
          <Select value={merged.currency ?? "ZAR"} onChange={(v) => set("currency", v)}
            options={["ZAR","USD","EUR","GBP","AUD","CAD"]} />
        </Field>
        <Field label="Monthly Income">
          <Input type="number" value={num("monthly_income")} onChange={(v) => set("monthly_income", Number(v) || 0)} />
        </Field>
        <Field label="Monthly Expenses">
          <Input type="number" value={num("monthly_expenses")} onChange={(v) => set("monthly_expenses", Number(v) || 0)} />
        </Field>
        <Field label="Monthly Savings">
          <Input type="number" value={num("monthly_savings")} onChange={(v) => set("monthly_savings", Number(v) || 0)} />
        </Field>
        <Field label="Existing Investments">
          <Input type="number" value={num("existing_investments")} onChange={(v) => set("existing_investments", Number(v) || 0)} />
        </Field>
        <Field label="Emergency Fund">
          <Input type="number" value={num("emergency_fund")} onChange={(v) => set("emergency_fund", Number(v) || 0)} />
        </Field>
        <Field label="Total Debt">
          <Input type="number" value={num("total_debt")} onChange={(v) => set("total_debt", Number(v) || 0)} />
        </Field>
        <Field label="Knowledge Level">
          <Select value={merged.knowledge_level ?? ""} onChange={(v) => set("knowledge_level", v)}
            options={["", "Beginner", "Intermediate", "Advanced"]} />
        </Field>
        <Field label="Investment Goal">
          <Select value={merged.investment_goal ?? ""} onChange={(v) => set("investment_goal", v)}
            options={["", "Wealth Building", "Retirement", "House Deposit", "Passive Income", "Education", "Other"]} />
        </Field>
        <Field label="Time Horizon">
          <Select value={merged.time_horizon ?? ""} onChange={(v) => set("time_horizon", v)}
            options={["", "< 3 years", "3-5 years", "5-10 years", "10+ years"]} />
        </Field>
        <Field label="Risk Tolerance">
          <Select value={merged.risk_tolerance ?? ""} onChange={(v) => set("risk_tolerance", v)}
            options={["", "Conservative", "Moderate", "Aggressive"]} />
        </Field>
      </div>

      <button
        disabled={save.isPending}
        onClick={() => save.mutate(merged)}
        className="gradient-primary text-primary-foreground rounded-lg h-10 px-5 text-sm font-medium shadow-glow inline-flex items-center gap-2"
      >
        {save.isPending && <Loader2 className="size-4 animate-spin" />}
        Save Profile
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
function Input({ value, onChange, type = "text", placeholder }: { value: any; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <input
      type={type}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
  );
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {options.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
    </select>
  );
}

/* -------------------- STRATEGY -------------------- */
function StrategyTab({ recommendations, ccy }: { recommendations: any[]; ccy: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(generateStrategy);
  const gen = useMutation({
    mutationFn: () => fn(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inv-dash"] }); toast.success("Strategy generated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const latest = recommendations.find((r) => r.kind === "strategy")?.content;
  const COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#1e40af", "#0ea5e9"];

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-lg font-semibold">AI Investment Strategy</div>
          <div className="text-sm text-muted-foreground">Personalized allocation based on your profile and risk tolerance.</div>
        </div>
        <button
          onClick={() => gen.mutate()}
          disabled={gen.isPending}
          className="gradient-primary text-primary-foreground rounded-lg h-10 px-5 text-sm font-medium shadow-glow inline-flex items-center gap-2"
        >
          {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate My Strategy
        </button>
      </div>

      {latest && (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="text-sm font-semibold">Suggested Asset Allocation</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={latest.allocation} dataKey="percentage" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50}>
                    {latest.allocation?.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {latest.allocation?.map((a: any, i: number) => (
                <div key={i} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {a.name}
                    </span>
                    <span className="font-semibold">{a.percentage}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground ml-4">{a.rationale}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="text-sm font-semibold">Strategy Summary</div>
            <p className="text-sm text-muted-foreground">{latest.summary}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Expected Risk</div>
                <div className="text-sm font-semibold mt-0.5">{latest.expectedRisk}</div>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Suggested Monthly</div>
                <div className="text-sm font-semibold mt-0.5">{fmt(Number(latest.monthlyContribution) || 0, ccy)}</div>
              </div>
            </div>
            {latest.rationale && (
              <div>
                <div className="text-xs font-medium mb-1">Rationale</div>
                <p className="text-xs text-muted-foreground">{latest.rationale}</p>
              </div>
            )}
            <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
              Educational only. Not financial advice.
            </div>
          </div>
        </div>
      )}

      {!latest && (
        <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
          Click "Generate My Strategy" to create your first AI-powered allocation.
        </div>
      )}
    </div>
  );
}

/* -------------------- SAVINGS -------------------- */
function SavingsTab({ profile, ccy }: { profile: any; ccy: string }) {
  const monthlyExpenses = Number(profile?.monthly_expenses) || 0;
  const monthlySavings = Number(profile?.monthly_savings) || 0;
  const monthlyIncome = Number(profile?.monthly_income) || 0;
  const ef = Number(profile?.emergency_fund) || 0;
  const debt = Number(profile?.total_debt) || 0;
  const efTarget = monthlyExpenses * 6;
  const efPct = efTarget > 0 ? Math.min(100, (ef / efTarget) * 100) : 0;
  const debtMonths = monthlySavings > 0 ? Math.ceil(debt / (monthlySavings * 0.5)) : null;
  const recSavings = Math.max(monthlySavings, monthlyIncome * 0.2);

  return (
    <div className="grid lg:grid-cols-2 gap-5">
      <SavingsCard title="Emergency Fund Target" current={ef} target={efTarget} ccy={ccy} pct={efPct}
        sub={`Target = 6 months of expenses (${fmt(efTarget, ccy)})`} />
      <SavingsCard title="Monthly Savings Target" current={monthlySavings} target={recSavings} ccy={ccy}
        pct={recSavings ? (monthlySavings / recSavings) * 100 : 0}
        sub="Recommended: save 20% of monthly income" />
      <div className="glass rounded-2xl p-6">
        <div className="text-sm font-semibold mb-1">Debt Reduction</div>
        <div className="text-xs text-muted-foreground mb-3">
          Allocate 50% of monthly savings to clearing high-interest debt.
        </div>
        <div className="text-2xl font-bold">{fmt(debt, ccy)}</div>
        <div className="text-xs text-muted-foreground mt-1">Outstanding debt</div>
        {debtMonths !== null && debt > 0 && (
          <div className="mt-3 text-sm">
            Estimated payoff: <span className="font-semibold">{debtMonths} months</span>
          </div>
        )}
      </div>
      <div className="glass rounded-2xl p-6">
        <div className="text-sm font-semibold mb-3">Quick Tips</div>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• Automate {fmt(Math.round(recSavings), ccy)} into savings on payday.</li>
          <li>• Keep emergency fund in a high-yield savings account.</li>
          <li>• Match employer pension contributions where possible.</li>
          <li>• Review subscriptions quarterly to cut unused spend.</li>
        </ul>
      </div>
    </div>
  );
}
function SavingsCard({ title, current, target, ccy, pct, sub }: any) {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-bold">{fmt(current, ccy)}</div>
        <div className="text-xs text-muted-foreground">/ {fmt(target, ccy)}</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full gradient-primary" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{Math.round(pct)}% complete</div>
    </div>
  );
}

/* -------------------- RETIREMENT -------------------- */
function RetirementTab({ profile, ccy }: { profile: any; ccy: string }) {
  const [age, setAge] = useState<number>(Number(profile?.age) || 30);
  const [retire, setRetire] = useState(65);
  const [monthly, setMonthly] = useState<number>(Number(profile?.monthly_savings) || 2000);
  const [current, setCurrent] = useState<number>(Number(profile?.existing_investments) || 0);
  const [rate, setRate] = useState(8);

  const years = Math.max(1, retire - age);
  const r = rate / 100 / 12;
  const n = years * 12;
  const fv = current * Math.pow(1 + rate / 100, years) + monthly * ((Math.pow(1 + r, n) - 1) / r);
  const monthlyIncome = (fv * 0.04) / 12;
  const chart = Array.from({ length: years + 1 }).map((_, i) => {
    const nn = i * 12;
    const v = current * Math.pow(1 + rate / 100, i) + monthly * ((Math.pow(1 + r, nn) - 1) / (r || 1e-9));
    return { age: age + i, value: Math.round(v) };
  });

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="text-sm font-semibold">Inputs</div>
        <Field label="Current Age"><Input type="number" value={age} onChange={(v) => setAge(Number(v) || 0)} /></Field>
        <Field label="Retirement Age"><Input type="number" value={retire} onChange={(v) => setRetire(Number(v) || 0)} /></Field>
        <Field label="Monthly Contribution"><Input type="number" value={monthly} onChange={(v) => setMonthly(Number(v) || 0)} /></Field>
        <Field label="Current Investments"><Input type="number" value={current} onChange={(v) => setCurrent(Number(v) || 0)} /></Field>
        <Field label="Expected Annual Return (%)"><Input type="number" value={rate} onChange={(v) => setRate(Number(v) || 0)} /></Field>
      </div>
      <div className="glass rounded-2xl p-6 lg:col-span-2 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <KpiCard label="Future Value" value={fmt(fv, ccy)} icon={TrendingUp} />
          <KpiCard label="Est. Monthly Income" value={fmt(monthlyIncome, ccy)} icon={Wallet} sub={[{ label: "Rule", value: "4% / yr" }]} />
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="age" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="value" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* -------------------- GOALS -------------------- */
function GoalsTab({ goals, ccy }: { goals: any[]; ccy: string }) {
  const qc = useQueryClient();
  const addFn = useServerFn(addGoal);
  const delFn = useServerFn(deleteGoal);
  const [form, setForm] = useState({ name: "", category: "House", target_amount: 0, current_amount: 0, target_date: "" });
  const add = useMutation({
    mutationFn: () => addFn({ data: { ...form, target_date: form.target_date || undefined } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inv-dash"] }); toast.success("Goal added"); setForm({ name: "", category: "House", target_amount: 0, current_amount: 0, target_date: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inv-dash"] }),
  });

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="glass rounded-2xl p-6 space-y-3">
        <div className="text-sm font-semibold">Add New Goal</div>
        <Field label="Name"><Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="House Deposit" /></Field>
        <Field label="Category">
          <Select value={form.category} onChange={(v) => setForm({ ...form, category: v })}
            options={["House", "Car", "Vacation", "Emergency Fund", "Retirement", "Education", "Other"]} />
        </Field>
        <Field label="Target Amount"><Input type="number" value={form.target_amount} onChange={(v) => setForm({ ...form, target_amount: Number(v) || 0 })} /></Field>
        <Field label="Current Amount"><Input type="number" value={form.current_amount} onChange={(v) => setForm({ ...form, current_amount: Number(v) || 0 })} /></Field>
        <Field label="Target Date"><Input type="date" value={form.target_date} onChange={(v) => setForm({ ...form, target_date: v })} /></Field>
        <button
          onClick={() => add.mutate()}
          disabled={!form.name || !form.target_amount || add.isPending}
          className="gradient-primary text-primary-foreground rounded-lg h-10 px-4 text-sm font-medium inline-flex items-center gap-2 w-full justify-center"
        >
          {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Add Goal
        </button>
      </div>

      <div className="lg:col-span-2 space-y-3">
        {goals.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center text-sm text-muted-foreground">
            No goals yet. Create one to start tracking.
          </div>
        )}
        {goals.map((g) => {
          const pct = g.target_amount > 0 ? Math.min(100, (g.current_amount / g.target_amount) * 100) : 0;
          return (
            <div key={g.id} className="glass rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{g.name}</div>
                  <div className="text-xs text-muted-foreground">{g.category} {g.target_date ? `· by ${g.target_date}` : ""}</div>
                </div>
                <button onClick={() => del.mutate(g.id)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <div className="text-xl font-bold">{fmt(Number(g.current_amount), ccy)}</div>
                <div className="text-xs text-muted-foreground">/ {fmt(Number(g.target_amount), ccy)}</div>
                <div className="ml-auto text-sm font-semibold text-primary">{Math.round(pct)}%</div>
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full gradient-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- HOLDINGS (within overview) -------------------- */
function HoldingsCard({ holdings, ccy }: { holdings: any[]; ccy: string }) {
  const qc = useQueryClient();
  const addFn = useServerFn(addHolding);
  const delFn = useServerFn(deleteHolding);
  const [form, setForm] = useState({ name: "", symbol: "", asset_type: "ETF", cost_basis: 0, current_value: 0, quantity: 0 });
  const add = useMutation({
    mutationFn: () => addFn({ data: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inv-dash"] }); toast.success("Holding added"); setForm({ name: "", symbol: "", asset_type: "ETF", cost_basis: 0, current_value: 0, quantity: 0 }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inv-dash"] }),
  });

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Portfolio Holdings</div>
      </div>
      <div className="grid lg:grid-cols-6 gap-2 mb-3">
        <input className="h-9 px-2 rounded-md bg-muted/60 border border-border text-sm lg:col-span-2" placeholder="Name (e.g. S&P 500 ETF)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="h-9 px-2 rounded-md bg-muted/60 border border-border text-sm" placeholder="Symbol" value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
        <select className="h-9 px-2 rounded-md bg-muted/60 border border-border text-sm" value={form.asset_type} onChange={(e) => setForm({ ...form, asset_type: e.target.value })}>
          {["ETF","Stock","Crypto","Bond","Cash","Real Estate","Other"].map(o => <option key={o}>{o}</option>)}
        </select>
        <input type="number" className="h-9 px-2 rounded-md bg-muted/60 border border-border text-sm" placeholder="Cost" value={form.cost_basis || ""} onChange={(e) => setForm({ ...form, cost_basis: Number(e.target.value) || 0 })} />
        <input type="number" className="h-9 px-2 rounded-md bg-muted/60 border border-border text-sm" placeholder="Value" value={form.current_value || ""} onChange={(e) => setForm({ ...form, current_value: Number(e.target.value) || 0 })} />
      </div>
      <button onClick={() => add.mutate()} disabled={!form.name || add.isPending}
        className="text-xs gradient-primary text-primary-foreground rounded-md h-8 px-3 mb-3 inline-flex items-center gap-1">
        {add.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />} Add
      </button>
      {holdings.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">No holdings yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2">Name</th>
                <th className="text-left">Type</th>
                <th className="text-right">Cost</th>
                <th className="text-right">Value</th>
                <th className="text-right">P/L</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => {
                const pl = Number(h.current_value) - Number(h.cost_basis);
                return (
                  <tr key={h.id} className="border-b border-border/50">
                    <td className="py-2">
                      <div className="font-medium">{h.name}</div>
                      {h.symbol && <div className="text-xs text-muted-foreground">{h.symbol}</div>}
                    </td>
                    <td className="text-muted-foreground text-xs">{h.asset_type}</td>
                    <td className="text-right">{fmt(Number(h.cost_basis), ccy)}</td>
                    <td className="text-right">{fmt(Number(h.current_value), ccy)}</td>
                    <td className={`text-right font-medium ${pl >= 0 ? "text-success" : "text-destructive"}`}>{fmt(pl, ccy)}</td>
                    <td className="text-right">
                      <button onClick={() => del.mutate(h.id)} className="p-1 rounded hover:bg-accent text-muted-foreground">
                        <Trash2 className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* -------------------- MARKET -------------------- */
function MarketTab() {
  const qc = useQueryClient();
  const getMarkets = useServerFn(getLiveMarkets);
  const getIdeas = useServerFn(getInvestmentIdeas);

  const marketsQuery = useQuery({
    queryKey: ["live-markets"],
    queryFn: () => getMarkets(),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const ideasQuery = useQuery({
    queryKey: ["investment-ideas"],
    queryFn: () => getIdeas({ data: {} }),
    staleTime: 30 * 60_000,
  });

  const quotes = marketsQuery.data?.quotes ?? [];
  const fetchedAt = marketsQuery.data?.fetchedAt;
  const ideas = (ideasQuery.data as any)?.ideas ?? [];
  const marketContext = (ideasQuery.data as any)?.marketContext;

  return (
    <div className="space-y-5">
      {/* Live header */}
      <div className="glass rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="size-2.5 rounded-full bg-emerald-400" />
            <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </div>
          <div>
            <div className="text-sm font-semibold">Live Markets</div>
            <div className="text-xs text-muted-foreground">
              Powered by Finnhub · {fetchedAt ? `Updated ${new Date(fetchedAt).toLocaleTimeString()}` : "Loading…"}
            </div>
          </div>
        </div>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["live-markets"] })}
          disabled={marketsQuery.isFetching}
          className="text-xs inline-flex items-center gap-1 px-3 h-8 rounded-md bg-accent hover:bg-accent/80"
        >
          {marketsQuery.isFetching ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          Refresh
        </button>
      </div>

      {marketsQuery.data?.error && (
        <div className="glass rounded-2xl p-4 text-sm text-destructive border border-destructive/30">
          {marketsQuery.data.error}
        </div>
      )}

      {/* Live quote grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {marketsQuery.isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 h-28 animate-pulse" />
            ))
          : quotes.map((q: any) => (
              <div key={q.symbol} className="glass rounded-2xl p-4 relative overflow-hidden">
                <div
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    background: `radial-gradient(80% 60% at 100% 0%, ${q.changePct >= 0 ? "var(--color-success)" : "var(--color-destructive)"} 0%, transparent 60%)`,
                  }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground truncate">{q.symbol}</div>
                    <div className={`text-[10px] px-1.5 py-0.5 rounded ${q.custom ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>{q.custom ? "Mine" : q.category}</div>
                  </div>
                  <div className="text-sm font-medium mt-0.5 truncate">{q.label}</div>
                  <div className="text-xl font-bold mt-1 tabular-nums">${q.price.toFixed(2)}</div>
                  <div className={`text-xs mt-1 font-medium ${q.changePct >= 0 ? "text-success" : "text-destructive"}`}>
                    {q.changePct >= 0 ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}% (${Math.abs(q.change).toFixed(2)})
                  </div>
                  {q.custom && q.invested > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/60 text-[11px] space-y-0.5">
                      <div className="flex justify-between text-muted-foreground"><span>Invested</span><span className="tabular-nums">${Number(q.invested).toFixed(0)}</span></div>
                      <div className="flex justify-between font-semibold"><span>Now</span><span className="tabular-nums">${Number(q.valueNow ?? q.invested).toFixed(2)}</span></div>
                      <div className={`flex justify-between font-medium ${q.pl >= 0 ? "text-success" : "text-destructive"}`}>
                        <span>P/L</span><span className="tabular-nums">{q.pl >= 0 ? "+" : ""}${Number(q.pl ?? 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>

      <CustomMarketsPanel />

      <SentimentCard />


      {/* Potential profits — AI ideas */}
      <div className="glass rounded-2xl p-5 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{ background: "radial-gradient(60% 50% at 0% 0%, var(--color-primary), transparent 60%)" }}
        />
        <div className="relative">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <div>
                <div className="text-sm font-semibold">Potential Profits · AI-Recommended Opportunities</div>
                <div className="text-[11px] text-muted-foreground">Backed by current macro themes & market structure · Educational only</div>
              </div>
            </div>
            <button
              onClick={() => qc.invalidateQueries({ queryKey: ["investment-ideas"] })}
              disabled={ideasQuery.isFetching}
              className="text-xs inline-flex items-center gap-1 px-3 h-8 rounded-md gradient-primary text-primary-foreground shadow-glow"
            >
              {ideasQuery.isFetching ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
              Refresh ideas
            </button>
          </div>

          {marketContext && (
            <div className="mb-4 text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
              {marketContext}
            </div>
          )}

          {ideasQuery.isLoading ? (
            <div className="py-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>
          ) : ideas.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No ideas yet. Tap refresh to generate the latest opportunities.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-3">
              {ideas.map((idea: any, i: number) => (
                <div key={i} className="rounded-xl p-4 border border-border/60 bg-card/40 hover:border-primary/40 transition">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <div className="font-semibold text-sm">{idea.title}</div>
                      {idea.ticker && (
                        <div className="text-[11px] text-primary font-mono">{idea.ticker}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-success">{idea.potentialUpside}</div>
                      <div className="text-[10px] text-muted-foreground">est. upside</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed mt-2">{idea.thesis}</p>
                  <div className="flex items-center gap-2 mt-3 text-[10px]">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${
                      idea.riskLevel === "Low" ? "bg-success/15 text-success" :
                      idea.riskLevel === "High" ? "bg-destructive/15 text-destructive" :
                      "bg-primary/15 text-primary"
                    }`}>
                      {idea.riskLevel} risk
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{idea.timeHorizon}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProfitCalculator ideas={ideas} defaultCcy="ZAR" />
    </div>
  );
}


/* -------------------- AI ASSISTANT -------------------- */
function AssistantTab() {
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: "Hi! I can help you understand your finances, build savings habits, and explore investment ideas. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const fn = useServerFn(askAssistant);
  const send = useMutation({
    mutationFn: (msg: string) => fn({ data: { message: msg, history: history.slice(-10) } }),
    onSuccess: (r) => setHistory((h) => [...h, { role: "assistant", content: r.reply }]),
    onError: (e: Error) => { toast.error(e.message); setHistory((h) => h.slice(0, -1)); },
  });

  const submit = () => {
    if (!input.trim() || send.isPending) return;
    const msg = input.trim();
    setHistory((h) => [...h, { role: "user", content: msg }]);
    setInput("");
    send.mutate(msg);
  };

  const quick = [
    "How much should I save each month?",
    "How can I reduce my debt?",
    "What is an ETF?",
    "Should I increase my emergency fund?",
  ];

  return (
    <div className="glass rounded-2xl flex flex-col h-[600px] max-h-[80vh]">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <div className="size-8 rounded-lg gradient-primary grid place-items-center">
          <MessageSquare className="size-4 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">AI Financial Assistant</div>
          <div className="text-[11px] text-muted-foreground">Educational only · Uses your stored data</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {history.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
            {m.role === "user" ? (
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2 bg-primary text-primary-foreground text-sm">{m.content}</div>
            ) : (
              <div className="max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
            )}
          </div>
        ))}
        {send.isPending && <div className="text-sm text-muted-foreground italic">Thinking…</div>}
      </div>
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {quick.map((q) => (
            <button key={q} onClick={() => { setInput(q); }}
              className="shrink-0 text-xs px-3 h-7 rounded-full bg-muted hover:bg-accent text-muted-foreground">
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Ask me anything about your finances…"
            className="flex-1 h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button onClick={submit} disabled={send.isPending || !input.trim()}
            className="gradient-primary text-primary-foreground rounded-lg h-10 px-4 inline-flex items-center gap-1 text-sm font-medium">
            {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- CUSTOM MARKETS WATCHLIST -------------------- */
function CustomMarketsPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCustomMarkets);
  const searchFn = useServerFn(searchSymbols);
  const addFn = useServerFn(addCustomMarket);
  const updFn = useServerFn(updateCustomMarket);
  const delFn = useServerFn(deleteCustomMarket);

  const { data } = useQuery({ queryKey: ["custom-markets"], queryFn: () => listFn() });
  const items = (data?.items ?? []) as any[];

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [invested, setInvested] = useState(0);
  const [picked, setPicked] = useState<{ symbol: string; description: string } | null>(null);

  const search = useMutation({ mutationFn: (query: string) => searchFn({ data: { query } }) });
  const add = useMutation({
    mutationFn: () => addFn({ data: {
      symbol: picked!.symbol,
      label: picked!.description || picked!.symbol,
      invested_amount: invested || 0,
    } }),
    onSuccess: () => {
      toast.success("Added to watchlist");
      qc.invalidateQueries({ queryKey: ["custom-markets"] });
      qc.invalidateQueries({ queryKey: ["live-markets"] });
      setOpen(false); setPicked(null); setQ(""); setInvested(0);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const upd = useMutation({
    mutationFn: (v: { id: string; invested_amount: number }) => updFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-markets"] }); qc.invalidateQueries({ queryKey: ["live-markets"] }); },
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-markets"] }); qc.invalidateQueries({ queryKey: ["live-markets"] }); toast.success("Removed"); },
  });

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">My Watchlist</div>
            <div className="text-[11px] text-muted-foreground">Track any Finnhub ticker (stocks, ETFs, crypto, forex). Set an invested amount to see live value & P/L.</div>
          </div>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs inline-flex items-center gap-1 px-3 h-8 rounded-md gradient-primary text-primary-foreground shadow-glow"
        >
          <Plus className="size-3" /> Add market
        </button>
      </div>

      {open && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-4 mb-4 space-y-3">
          <div className="flex gap-2">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) search.mutate(q.trim()); }}
              placeholder="Search e.g. Bitcoin, AAPL, BINANCE:BTCUSDT"
              className="flex-1 h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={() => q.trim() && search.mutate(q.trim())}
              disabled={search.isPending || !q.trim()}
              className="h-10 px-4 rounded-lg bg-accent text-sm inline-flex items-center gap-1"
            >
              {search.isPending ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />} Search
            </button>
          </div>

          {search.data?.matches && search.data.matches.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-border/50 divide-y divide-border/50">
              {search.data.matches.map((m: any) => (
                <button
                  key={m.symbol}
                  onClick={() => setPicked({ symbol: m.symbol, description: m.description })}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center justify-between gap-3 ${picked?.symbol === m.symbol ? "bg-accent" : ""}`}
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.description}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">{m.symbol}</div>
                  </div>
                  <div className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">{m.type}</div>
                </button>
              ))}
            </div>
          )}
          {search.data?.error && <div className="text-xs text-destructive">{search.data.error}</div>}

          {picked && (
            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <div className="text-xs"><span className="text-muted-foreground">Selected: </span><span className="font-medium">{picked.description}</span> <span className="font-mono text-primary">({picked.symbol})</span></div>
              <label className="block">
                <div className="text-[11px] text-muted-foreground mb-1">How much have you invested? (optional)</div>
                <input
                  type="number"
                  value={invested || ""}
                  onChange={(e) => setInvested(Number(e.target.value) || 0)}
                  placeholder="e.g. 100"
                  className="w-full h-10 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </label>
              <button
                onClick={() => add.mutate()}
                disabled={add.isPending}
                className="h-9 px-4 rounded-lg gradient-primary text-primary-foreground text-sm inline-flex items-center gap-1 shadow-glow"
              >
                {add.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />} Add to watchlist
              </button>
            </div>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-6">
          No custom markets yet. Add Bitcoin, your favourite stock or ETF — its live price will appear in the quote grid above.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it: any) => (
            <div key={it.id} className="flex items-center gap-2 p-3 rounded-lg border border-border/50 bg-card/30">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{it.label}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{it.symbol}</div>
              </div>
              <input
                type="number"
                defaultValue={Number(it.invested_amount) || 0}
                onBlur={(e) => {
                  const v = Number(e.target.value) || 0;
                  if (v !== Number(it.invested_amount)) upd.mutate({ id: it.id, invested_amount: v });
                }}
                className="w-28 h-9 px-2 rounded-md bg-muted/60 border border-border text-sm text-right tabular-nums"
                placeholder="Invested"
              />
              <button onClick={() => del.mutate(it.id)} className="p-2 rounded-md hover:bg-accent text-muted-foreground" aria-label="Remove">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
