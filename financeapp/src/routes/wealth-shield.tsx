import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Shield, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2,
  ChevronRight, Target, Wallet, BarChart3, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getInvestmentDashboard, getProfile, computeHealthScore,
} from "@/lib/investment.functions";
import { useAccounts, useIncomes, useExpenses, inMonth } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/wealth-shield")({ component: WealthShield });

// South African CPI annual rates (approximate historical averages)
const SA_CPI_RATES: Record<number, number> = {
  2020: 0.034, 2021: 0.044, 2022: 0.069, 2023: 0.060, 2024: 0.053, 2025: 0.047,
};
function realValue(nominal: number, fromYear: number, toYear: number): number {
  let v = nominal;
  for (let y = fromYear; y < toYear; y++) {
    const rate = SA_CPI_RATES[y] ?? 0.055;
    v = v / (1 + rate);
  }
  return v;
}

function WealthShield() {
  const qc = useQueryClient();
  const [purchasingPowerOn, setPurchasingPowerOn] = useState(false);
  const [baseYear, setBaseYear] = useState(2023);

  const { items: accounts } = useAccounts();
  const { items: incomes } = useIncomes();
  const { items: expenses } = useExpenses();

  const getDash = useServerFn(getInvestmentDashboard);
  const dashQ = useQuery({ queryKey: ["inv-dash"], queryFn: () => getDash(), staleTime: 60_000 });
  const dash: any = dashQ.data ?? {};
  const profile: any = dash.profile ?? {};
  const score: any = dash.score ?? null;
  const holdings: any[] = dash.holdings ?? [];

  const getProf = useServerFn(getProfile);
  useQuery({ queryKey: ["fin-profile"], queryFn: () => getProf(), staleTime: 60_000 });

  const computeFn = useServerFn(computeHealthScore);
  const refreshScore = useMutation({
    mutationFn: () => computeFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inv-dash"] });
      toast.success("Health score updated");
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  /* ── Derived numbers ── */
  const totalAssets = accounts
    .filter((a) => !a.isLiability)
    .reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts
    .filter((a) => a.isLiability)
    .reduce((s, a) => s + a.balance, 0);
  const netWorth = totalAssets - totalLiabilities;

  const portfolioValue = holdings.reduce((s, h) => s + Number(h.current_value || 0), 0);
  const totalRealAssets = totalAssets + portfolioValue;
  const totalNetWorth = totalRealAssets - totalLiabilities;

  const emergencyFund = Number(profile?.emergency_fund) || 0;
  const totalDebt = Number(profile?.total_debt) || totalLiabilities;
  const monthlyExpenses = expenses.filter((e) => inMonth(e.date)).reduce((a, b) => a + b.cost, 0);
  const incomeMo = incomes.filter((i) => inMonth(i.date)).reduce((a, b) => a + b.amount, 0);

  const emergencyMonths = monthlyExpenses > 0 ? emergencyFund / monthlyExpenses : 0;
  const debtToIncome = incomeMo > 0 ? (totalDebt / (incomeMo * 12)) * 100 : 0;
  const savingsRate = incomeMo > 0 ? ((incomeMo - monthlyExpenses) / incomeMo) * 100 : 0;

  const healthScore: number = score?.score ?? 0;
  const scoreColor = healthScore >= 80 ? "text-emerald-400" : healthScore >= 60 ? "text-amber-400" : "text-rose-400";
  const scoreGlow = healthScore >= 80
    ? "oklch(0.72 0.19 155 / 0.4)"
    : healthScore >= 60
    ? "oklch(0.82 0.15 80 / 0.4)"
    : "oklch(0.65 0.22 25 / 0.4)";

  const strengths: string[] = score?.strengths ?? [];
  const improvements: string[] = score?.improvements ?? [];

  return (
    <div className="space-y-5 pb-6 max-w-2xl mx-auto lg:max-w-none">

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden p-6"
        style={{
          background: "linear-gradient(145deg, oklch(0.20 0.035 155), oklch(0.14 0.018 155) 60%, oklch(0.12 0.005 270))",
          border: "1px solid oklch(0.72 0.19 155 / 0.25)",
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.19 155 / 0.15) 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="size-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">Wealth Shield</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Protection &amp; Safety</h1>
            <p className="text-sm text-white/50 mt-1">Your financial safety net at a glance</p>
          </div>
          {healthScore > 0 && (
            <div className="shrink-0 text-center">
              <div className={`text-4xl font-bold tabular-nums ${scoreColor}`}
                style={{ textShadow: `0 0 20px ${scoreGlow}` }}>
                {healthScore}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/40">Health Score</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Net Worth Overview ────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Wallet className="size-4 text-primary" /> Net Worth
          </h2>
          <Link to="/accounts" className="text-xs text-primary inline-flex items-center gap-1">
            Manage <ChevronRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-2xl p-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Assets</div>
            <div className="text-lg font-bold text-emerald-400 tabular-nums">{fmtMoney(totalRealAssets)}</div>
          </div>
          <div className="glass rounded-2xl p-4 text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Liabilities</div>
            <div className="text-lg font-bold text-rose-400 tabular-nums">{fmtMoney(totalLiabilities)}</div>
          </div>
          <div className="glass rounded-2xl p-4 text-center border border-primary/20">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Net Worth</div>
            <div className={`text-lg font-bold tabular-nums ${totalNetWorth >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {fmtMoney(totalNetWorth)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Safety Metrics ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Emergency Fund */}
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center gap-2 mb-3">
            <div className={`size-9 rounded-xl grid place-items-center ${emergencyMonths >= 3 ? "bg-emerald-500/15" : emergencyMonths >= 1 ? "bg-amber-500/15" : "bg-rose-500/15"}`}>
              <Shield className={`size-4 ${emergencyMonths >= 3 ? "text-emerald-400" : emergencyMonths >= 1 ? "text-amber-400" : "text-rose-400"}`} />
            </div>
            <div>
              <div className="text-xs font-semibold">Emergency Fund</div>
              <div className="text-[10px] text-muted-foreground">Liquidity buffer</div>
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums">{fmtMoney(emergencyFund)}</div>
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, (emergencyMonths / 6) * 100)}%`,
                  background: emergencyMonths >= 3 ? "oklch(0.72 0.19 155)" : emergencyMonths >= 1 ? "oklch(0.82 0.15 80)" : "oklch(0.65 0.22 25)",
                }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {emergencyMonths > 0 ? `${emergencyMonths.toFixed(1)} months of expenses` : "Not configured"}
              <span className="text-muted-foreground/60"> · target 6 mo</span>
            </div>
          </div>
          {emergencyMonths < 3 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle className="size-3" /> Below recommended 3-month buffer
            </div>
          )}
        </div>

        {/* Debt Ratio */}
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center gap-2 mb-3">
            <div className={`size-9 rounded-xl grid place-items-center ${debtToIncome < 30 ? "bg-emerald-500/15" : debtToIncome < 60 ? "bg-amber-500/15" : "bg-rose-500/15"}`}>
              <TrendingDown className={`size-4 ${debtToIncome < 30 ? "text-emerald-400" : debtToIncome < 60 ? "text-amber-400" : "text-rose-400"}`} />
            </div>
            <div>
              <div className="text-xs font-semibold">Debt Burden</div>
              <div className="text-[10px] text-muted-foreground">Debt to annual income</div>
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums">{fmtMoney(totalDebt)}</div>
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, debtToIncome)}%`,
                  background: debtToIncome < 30 ? "oklch(0.72 0.19 155)" : debtToIncome < 60 ? "oklch(0.82 0.15 80)" : "oklch(0.65 0.22 25)",
                }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {incomeMo > 0 ? `${debtToIncome.toFixed(0)}% of annual income` : "Add income to calculate"}
            </div>
          </div>
          {debtToIncome > 60 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-rose-400">
              <AlertTriangle className="size-3" /> High debt ratio — consider reducing
            </div>
          )}
        </div>

        {/* Savings Rate */}
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center gap-2 mb-3">
            <div className={`size-9 rounded-xl grid place-items-center ${savingsRate >= 20 ? "bg-emerald-500/15" : savingsRate >= 10 ? "bg-amber-500/15" : "bg-rose-500/15"}`}>
              <TrendingUp className={`size-4 ${savingsRate >= 20 ? "text-emerald-400" : savingsRate >= 10 ? "text-amber-400" : "text-rose-400"}`} />
            </div>
            <div>
              <div className="text-xs font-semibold">Savings Rate</div>
              <div className="text-[10px] text-muted-foreground">This month</div>
            </div>
          </div>
          <div className="text-2xl font-bold tabular-nums">{savingsRate > 0 ? `${savingsRate.toFixed(0)}%` : "—"}</div>
          <div className="mt-2">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(100, Math.max(0, savingsRate))}%`,
                  background: savingsRate >= 20 ? "oklch(0.72 0.19 155)" : savingsRate >= 10 ? "oklch(0.82 0.15 80)" : "oklch(0.65 0.22 25)",
                }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {incomeMo > 0 ? `${fmtMoney(Math.max(0, incomeMo - monthlyExpenses))} saved of ${fmtMoney(incomeMo)}` : "Add income to calculate"}
              <span className="text-muted-foreground/60"> · target 20%</span>
            </div>
          </div>
          {savingsRate > 0 && savingsRate < 10 && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-400">
              <AlertTriangle className="size-3" /> Below recommended 20% rate
            </div>
          )}
        </div>
      </div>

      {/* ── Financial Health Score ────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 shadow-elegant">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-primary" />
            <h2 className="font-semibold">Financial Health Score</h2>
          </div>
          <button
            onClick={() => refreshScore.mutate()}
            disabled={refreshScore.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium shadow-glow disabled:opacity-50"
          >
            <RefreshCw className={`size-3 ${refreshScore.isPending ? "animate-spin" : ""}`} />
            {refreshScore.isPending ? "Calculating…" : "Refresh"}
          </button>
        </div>

        {healthScore > 0 ? (
          <>
            {/* Score gauge */}
            <div className="flex items-center gap-5 mb-5">
              <div className="relative size-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="oklch(1 0 0 / 0.06)" strokeWidth="10" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={healthScore >= 80 ? "oklch(0.72 0.19 155)" : healthScore >= 60 ? "oklch(0.82 0.15 80)" : "oklch(0.65 0.22 25)"}
                    strokeWidth="10"
                    strokeDasharray={`${(healthScore / 100) * 251.2} 251.2`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
                  <span className={`text-xl font-bold ${scoreColor}`}>{healthScore}</span>
                  <span className="text-[9px] text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-semibold mb-1 ${scoreColor}`}>
                  {healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : healthScore >= 40 ? "Fair" : "Needs Attention"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {score?.risk_level && <span>Risk level: <strong>{score.risk_level}</strong></span>}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Based on your income, expenses, debt, emergency fund and investments.
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {strengths.length > 0 && (
                <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-3">
                  <div className="text-xs font-semibold text-emerald-400 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="size-3.5" /> Strengths
                  </div>
                  <ul className="space-y-1">
                    {strengths.slice(0, 4).map((s, i) => (
                      <li key={i} className="text-[11px] text-emerald-300/80">· {s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {improvements.length > 0 && (
                <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-3">
                  <div className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1">
                    <AlertTriangle className="size-3.5" /> To improve
                  </div>
                  <ul className="space-y-1">
                    {improvements.slice(0, 4).map((s, i) => (
                      <li key={i} className="text-[11px] text-amber-300/80">· {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <Shield className="size-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No health score yet</p>
            <p className="text-xs text-muted-foreground/60 mb-4">Complete your financial profile and click Refresh to generate your score.</p>
            <Link to="/financial-profile" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-sm font-medium shadow-glow">
              <Target className="size-4" /> Complete Profile
            </Link>
          </div>
        )}
      </div>

      {/* ── Purchasing Power Mirror ───────────────────────────────── */}
      <div className="glass rounded-2xl p-5 shadow-elegant">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Eye className="size-4 text-primary" />
            <h2 className="font-semibold">Purchasing Power Mirror</h2>
          </div>
          <button
            onClick={() => setPurchasingPowerOn(v => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${purchasingPowerOn ? "bg-primary" : "bg-muted"}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform ${purchasingPowerOn ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Because of South Africa's inflation, R1 000 today is worth less than R1 000 in {baseYear}. Toggle to see your wealth in real terms.
        </p>

        {purchasingPowerOn ? (
          <>
            {/* Year picker */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs text-muted-foreground">Show in</span>
              {[2020, 2021, 2022, 2023].map(y => (
                <button
                  key={y}
                  onClick={() => setBaseYear(y)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${baseYear === y ? "gradient-primary text-primary-foreground shadow-glow" : "glass border border-border/60 text-muted-foreground"}`}
                >
                  {y} Rands
                </button>
              ))}
            </div>

            {/* Comparison table */}
            <div className="space-y-3">
              {[
                { label: "Total Account Balance", nominal: totalNetWorth },
                { label: "Emergency Fund", nominal: emergencyFund },
                { label: "Portfolio Value", nominal: portfolioValue },
              ].map(({ label, nominal }) => {
                const currentYear = new Date().getFullYear();
                const real = realValue(nominal, baseYear, currentYear);
                const loss = nominal - real;
                const lossPct = nominal > 0 ? ((loss / nominal) * 100).toFixed(0) : "0";

                return (
                  <div key={label} className="rounded-xl border border-border/60 p-4"
                    style={{ background: "oklch(0.18 0.008 155 / 0.4)" }}>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="text-sm font-medium">{label}</div>
                      <div className="flex items-center gap-2 flex-wrap text-right">
                        <div>
                          <div className="text-[10px] text-muted-foreground">Nominal (today)</div>
                          <div className="text-base font-bold tabular-nums">{fmtMoney(nominal)}</div>
                        </div>
                        <div className="text-muted-foreground/40 text-xs">→</div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">{baseYear} buying power</div>
                          <div className="text-base font-bold tabular-nums text-amber-400">{fmtMoney(real)}</div>
                        </div>
                      </div>
                    </div>
                    {nominal > 0 && (
                      <div className="mt-2 text-[11px] text-rose-400 flex items-center gap-1">
                        <TrendingDown className="size-3" />
                        Inflation has eroded {fmtMoney(loss)} ({lossPct}%) of purchasing power since {baseYear}.
                        {Number(lossPct) > 15 && <span className="ml-1 text-muted-foreground">Consider investing to beat inflation.</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl bg-amber-500/8 border border-amber-500/15 p-3 text-[11px] text-amber-300/80">
              <strong>Beat inflation:</strong> South Africa's average CPI is ~5–7% per year. Money sitting in a savings account at 4% is actually losing real value. Consider Reg 28-compliant unit trusts, ETFs (Satrix, Sygnia), or tax-free savings accounts (TFSA) to preserve purchasing power.
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center">
            <EyeOff className="size-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Toggle the switch to reveal your wealth in inflation-adjusted Rands</p>
          </div>
        )}
      </div>

      {/* ── Quick Protect Actions ─────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 shadow-elegant">
        <h2 className="font-semibold mb-4">Protect Your Wealth</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { to: "/financial-profile", icon: Target, label: "Update Profile", color: "bg-emerald-500/15 text-emerald-400" },
            { to: "/goals", icon: Shield, label: "Set Goals", color: "bg-sky-500/15 text-sky-400" },
            { to: "/investments", icon: TrendingUp, label: "Investments", color: "bg-violet-500/15 text-violet-400" },
            { to: "/accounts", icon: Wallet, label: "Accounts", color: "bg-amber-500/15 text-amber-400" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:-translate-y-0.5 transition-smooth border border-border/60 hover:border-primary/40"
              style={{ background: "oklch(0.18 0.008 155 / 0.5)" }}
            >
              <div className={`size-10 rounded-xl grid place-items-center ${item.color}`}>
                <item.icon className="size-5" />
              </div>
              <span className="text-xs font-medium">{item.label}</span>
              <ChevronRight className="size-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
