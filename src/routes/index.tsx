import { createFileRoute, Link } from "@tanstack/react-router";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import {
  DollarSign, TrendingUp, Receipt, Repeat, Target, ArrowUp, ArrowDown,
  Wallet, ChevronRight, Plus, LineChart as LineIcon,
} from "lucide-react";
import { useAccounts, useExpenses, useIncomes, useSubs, inMonth, inYear } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { openAddModal } from "@/components/AddFAB";
import { getInvestmentDashboard, getProfile } from "@/lib/investment.functions";
import { postDueSubscriptions, getUpcomingRenewals, snapshotNetWorth, getNetWorthHistory } from "@/lib/automation.functions";
import { listBudgets } from "@/lib/budgets.functions";
import { toast } from "sonner";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { items: incomes } = useIncomes();
  const { items: expenses } = useExpenses();
  const { items: subs } = useSubs();
  const { items: accounts } = useAccounts();
  const getDash = useServerFn(getInvestmentDashboard);
  const invQ = useQuery({ queryKey: ["inv-dash"], queryFn: () => getDash(), staleTime: 60_000 });
  const holdings: any[] = (invQ.data as any)?.holdings ?? [];
  const invested = holdings.reduce((s, h) => s + Number(h.cost_basis || 0), 0);
  const portfolioValue = holdings.reduce((s, h) => s + Number(h.current_value || 0), 0);
  const portfolioPL = portfolioValue - invested;

  const getProf = useServerFn(getProfile);
  const profQ = useQuery({ queryKey: ["fin-profile"], queryFn: () => getProf(), staleTime: 60_000 });
  const profile: any = (profQ.data as any)?.profile ?? {};

  const incomeMo = incomes.filter((i) => inMonth(i.date)).reduce((a, b) => a + b.amount, 0);
  const incomeYr = incomes.filter((i) => inYear(i.date)).reduce((a, b) => a + b.amount, 0);
  const expenseMo = expenses.filter((e) => inMonth(e.date)).reduce((a, b) => a + b.cost, 0);
  const expenseYr = expenses.filter((e) => inYear(e.date)).reduce((a, b) => a + b.cost, 0);
  const subsActive = subs.filter((s) => s.status === "Active");
  const subsCost = subsActive.reduce((a, s) => a + s.monthlyCost, 0);
  const netMo = incomeMo - expenseMo;

  // last 6 months series
  const series = useMemo(() => {
    const now = new Date();
    const out: Array<{ month: string; income: number; expenses: number; net: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const inc = incomes.filter((x) => x.date.startsWith(ym)).reduce((a, b) => a + b.amount, 0);
      const exp = expenses.filter((x) => x.date.startsWith(ym)).reduce((a, b) => a + b.cost, 0);
      out.push({ month: d.toLocaleString("en", { month: "short" }), income: inc, expenses: exp, net: inc - exp });
    }
    return out;
  }, [incomes, expenses]);

  /* ---- Automation: post due subscription charges + snapshot net worth (once per visit) ---- */
  const qc = useQueryClient();
  const postDueFn = useServerFn(postDueSubscriptions);
  const snapshotFn = useServerFn(snapshotNetWorth);
  const ranAutomation = useRef(false);
  useEffect(() => {
    if (ranAutomation.current) return;
    ranAutomation.current = true;
    postDueFn()
      .then((r) => {
        if (r.posted.length > 0) {
          toast.info(`Posted ${r.posted.length} subscription charge${r.posted.length === 1 ? "" : "s"}: ${r.posted.join(", ")}`);
          qc.invalidateQueries({ queryKey: ["expenses"] });
          qc.invalidateQueries({ queryKey: ["subscriptions"] });
        }
      })
      .catch(() => {});
    snapshotFn()
      .then(() => qc.invalidateQueries({ queryKey: ["networth-history"] }))
      .catch(() => {});
  }, [postDueFn, snapshotFn, qc]);

  /* ---- Renewal reminders (next 7 days) ---- */
  const renewalsFn = useServerFn(getUpcomingRenewals);
  const renewalsQ = useQuery({ queryKey: ["upcoming-renewals"], queryFn: () => renewalsFn(), staleTime: 10 * 60_000 });
  const upcoming = renewalsQ.data?.items ?? [];

  /* ---- Net worth history ---- */
  const nwFn = useServerFn(getNetWorthHistory);
  const nwQ = useQuery({ queryKey: ["networth-history"], queryFn: () => nwFn({ data: { days: 365 } }), staleTime: 10 * 60_000 });
  const nwPoints = nwQ.data?.points ?? [];

  /* ---- Budget alerts ---- */
  const budgetsFn = useServerFn(listBudgets);
  const budgetsQ = useQuery({ queryKey: ["budgets"], queryFn: () => budgetsFn(), staleTime: 60_000 });
  const hotBudgets = (budgetsQ.data?.items ?? []).filter((b) => b.pct >= 80);

  const savedMo = Math.max(0, incomeMo - expenseMo);
  const monthlyGoal = Number(profile?.monthly_savings_goal) || 0;
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((savedMo / monthlyGoal) * 100)) : 0;

  const empty = incomes.length + expenses.length + subs.length === 0;

  return (
    <>
      <PageHeader title="My Finances" subtitle="Everything you earn, spend, and own — in one place." />

      {(upcoming.length > 0 || hotBudgets.length > 0) && (
        <div className="mb-5 space-y-2">
          {upcoming.length > 0 && (
            <div className="glass rounded-xl px-4 py-3 border border-primary/25 flex items-start gap-3 text-sm">
              <Bell className="size-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <span className="font-medium">Renewing soon: </span>
                <span className="text-muted-foreground">
                  {upcoming.map((u: any) => `${u.name} (${fmtMoney(Number(u.amount) || 0)} on ${u.next_renewal})`).join(" · ")}
                </span>
              </div>
            </div>
          )}
          {hotBudgets.map((b) => (
            <Link key={b.id} to="/budgets" className="glass rounded-xl px-4 py-3 border border-amber-500/30 flex items-start gap-3 text-sm block hover:border-amber-400/60 transition">
              <span className={`size-2 rounded-full mt-1.5 shrink-0 ${b.pct >= 100 ? "bg-rose-500" : "bg-amber-400"}`} />
              <div>
                <span className="font-medium">{b.category} budget {b.pct >= 100 ? "exceeded" : `at ${b.pct}%`}: </span>
                <span className="text-muted-foreground">{fmtMoney(b.spent)} of {fmtMoney(b.monthly_limit)} this month.</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Link to="/earnings" className="block hover:scale-[1.01] transition">
          <KpiCard label="Income (mo)" value={fmtMoney(incomeMo)} icon={DollarSign} sub={[{ label: "YTD", value: fmtMoney(incomeYr) }]} />
        </Link>
        <Link to="/expenses" className="block hover:scale-[1.01] transition">
          <KpiCard label="Expenses (mo)" value={fmtMoney(expenseMo)} icon={Receipt} sub={[{ label: "YTD", value: fmtMoney(expenseYr) }]} />
        </Link>
        <Link to="/forecast" className="block hover:scale-[1.01] transition">
          <KpiCard label="Net (mo)" value={fmtMoney(netMo)} icon={TrendingUp} sub={[{ label: "Margin", value: incomeMo ? `${Math.round((netMo / incomeMo) * 100)}%` : "—" }]} />
        </Link>
        <Link to="/subscriptions" className="block hover:scale-[1.01] transition">
          <KpiCard label="Subscriptions" value={fmtMoney(subsCost)} icon={Repeat} sub={[{ label: "Active", value: String(subsActive.length) }, { label: "Annual", value: fmtMoney(subsCost * 12) }]} />
        </Link>

        <Link to="/goals" className="glass rounded-2xl p-5 shadow-elegant col-span-2 lg:col-span-2 block hover:scale-[1.005] transition group">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Monthly Goal</div>
              <div className="mt-1 text-2xl font-semibold tracking-tight">
                {fmtMoney(savedMo)} <span className="text-sm text-muted-foreground font-normal">/ {monthlyGoal > 0 ? fmtMoney(monthlyGoal) : "set a goal"}</span>
              </div>
            </div>
            <div className="size-10 rounded-xl bg-accent grid place-items-center group-hover:bg-primary/20 transition">
              <Target className="size-5 text-accent-foreground" />
            </div>
          </div>
          <div className="mt-4">
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full gradient-primary shadow-glow transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{monthlyGoal > 0 ? `${goalPct}% reached` : "Tap to set a savings target"}</span>
              <span>{monthlyGoal > 0 ? `${fmtMoney(Math.max(0, monthlyGoal - savedMo))} to go` : ""}</span>
            </div>
          </div>
        </Link>
      </div>

      {accounts.length > 0 && (
        <div className="mt-6 glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              <h3 className="font-semibold">Accounts</h3>
              <span className="text-xs text-muted-foreground">
                · {fmtMoney(accounts.reduce((s, a) => s + (a.isLiability ? -a.balance : a.balance), 0))} net
              </span>
            </div>
            <Link to="/accounts" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
              Manage <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {accounts.map((a) => (
              <Link
                key={a.id}
                to="/accounts/$id"
                params={{ id: a.id }}
                className="shrink-0 w-44 rounded-xl border border-border/60 p-3 hover:border-primary/50 transition relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${a.color ?? "#3B82F6"}15, transparent 60%)` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="size-6 rounded-md" style={{ background: a.color ?? "#3B82F6" }} />
                  <div className="text-xs font-medium truncate">{a.name}</div>
                </div>
                <div className="text-lg font-semibold tabular-nums">
                  {a.isLiability && "−"}{fmtMoney(a.balance)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{a.type} · {a.currency}</div>
              </Link>
            ))}
            <Link
              to="/accounts"
              className="shrink-0 w-44 rounded-xl border border-dashed border-border/60 p-3 grid place-items-center text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition"
            >
              <span className="inline-flex items-center gap-1"><Plus className="size-3.5" /> Add account</span>
            </Link>
          </div>
        </div>
      )}

      <Link
        to="/investments"
        className="mt-6 group glass rounded-2xl p-5 shadow-elegant flex items-center gap-4 relative overflow-hidden hover:border-primary/40 transition border border-transparent"
      >
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{ background: "radial-gradient(60% 80% at 100% 0%, var(--color-primary), transparent 70%)" }}
        />
        <div className="size-12 rounded-xl gradient-primary grid place-items-center shadow-glow shrink-0">
          <LineIcon className="size-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0 relative">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Money invested in markets</div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{holdings.length} {holdings.length === 1 ? "holding" : "holdings"}</span>
          </div>
          <div className="mt-0.5 flex items-baseline gap-3 flex-wrap">
            <span className="text-2xl font-bold tabular-nums">{fmtMoney(portfolioValue)}</span>
            <span className="text-xs text-muted-foreground">invested {fmtMoney(invested)}</span>
            <span className={`text-xs font-semibold ${portfolioPL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {portfolioPL >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs(portfolioPL))}
              {invested > 0 && ` (${((portfolioPL / invested) * 100).toFixed(1)}%)`}
            </span>
          </div>
        </div>
        <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition relative" />
      </Link>

      {nwPoints.length >= 2 && (
        <div className="mt-6 glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Net Worth</h3>
            <span className="text-sm font-semibold tabular-nums">
              {fmtMoney(nwPoints[nwPoints.length - 1].netWorth)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Daily snapshots · accounts + investments − liabilities</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={nwPoints}>
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} minTickGap={40} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={70} tickFormatter={(v: number) => fmtMoney(v)} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(Number(v))} />
                <Area type="monotone" dataKey="netWorth" name="Net worth" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#nwGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-6">
        <Link to="/forecast" className="xl:col-span-2 glass rounded-2xl p-5 shadow-elegant block hover:scale-[1.005] transition group">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold group-hover:text-primary transition">Cash Flow</h3>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition" />
          </div>
          <p className="text-xs text-muted-foreground mb-3">Income vs expenses · last 6 months</p>
          <div className="h-56 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-4)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-4)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(Number(v))} />
                <Area type="monotone" dataKey="income" stroke="var(--color-chart-3)" strokeWidth={2.5} fill="url(#incGrad)" />
                <Area type="monotone" dataKey="expenses" stroke="var(--color-chart-4)" strokeWidth={2.5} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Link>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Recent activity</h3>
          {empty ? (
            <EmptyHint />
          ) : (
            <ul className="space-y-2">
              {[
                ...incomes.slice(0, 4).map((i) => ({ kind: "in" as const, ...i })),
                ...expenses.slice(0, 4).map((e) => ({ kind: "out" as const, ...e })),
              ]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 6)
                .map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border/60 last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`size-7 grid place-items-center rounded-full ${r.kind === "in" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                        {r.kind === "in" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.kind === "in" ? r.source : r.description}</div>
                        <div className="text-[11px] text-muted-foreground">{r.category} · {r.date}</div>
                      </div>
                    </div>
                    <div className={`font-semibold ${r.kind === "in" ? "text-emerald-400" : "text-rose-400"}`}>
                      {r.kind === "in" ? "+" : "−"}{fmtMoney(r.kind === "in" ? r.amount : r.cost)}
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}

function EmptyHint() {
  return (
    <div className="text-center py-6">
      <p className="text-sm text-muted-foreground mb-3">Nothing tracked yet.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => openAddModal("income")} className="px-3 h-9 rounded-lg gradient-primary text-primary-foreground text-xs font-medium shadow-glow">Add income</button>
        <button onClick={() => openAddModal("expense")} className="px-3 h-9 rounded-lg border border-border text-xs">Add expense</button>
        <button onClick={() => openAddModal("receipt")} className="px-3 h-9 rounded-lg border border-border text-xs">Scan receipt</button>
      </div>
    </div>
  );
}
