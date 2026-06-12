import { createFileRoute, Link } from "@tanstack/react-router";
import {
  TrendingUp, ArrowUp, ArrowDown, ChevronRight, Plus, Wallet,
  CreditCard, Send, Download, MoreHorizontal, Bell, Shield,
  Target, Repeat, Receipt, BarChart3, Share2, Trophy, Crown, Clock,
} from "lucide-react";
import { useAccounts, useExpenses, useIncomes, useSubs, inMonth, inYear } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis,
} from "recharts";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { openAddModal } from "@/components/AddFAB";
import { getInvestmentDashboard, getProfile } from "@/lib/investment.functions";
import { getActiveChallenge, getUserChallengeStatus } from "@/lib/challenges.functions";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({ component: Dashboard });

function Dashboard() {
  const { session } = useSession();
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

  const totalBalance = accounts.reduce((s, a) => s + (a.isLiability ? -a.balance : a.balance), 0);

  const savedMo = Math.max(0, incomeMo - expenseMo);
  const monthlyGoal = Number(profile?.monthly_savings_goal) || 0;
  const goalPct = monthlyGoal > 0 ? Math.min(100, Math.round((savedMo / monthlyGoal) * 100)) : 0;

  const series = useMemo(() => {
    const now = new Date();
    const out: Array<{ month: string; income: number; expenses: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const inc = incomes.filter((x) => x.date.startsWith(ym)).reduce((a, b) => a + b.amount, 0);
      const exp = expenses.filter((x) => x.date.startsWith(ym)).reduce((a, b) => a + b.cost, 0);
      out.push({ month: d.toLocaleString("en", { month: "short" }), income: inc, expenses: exp });
    }
    return out;
  }, [incomes, expenses]);

  const recentActivity = [
    ...incomes.slice(0, 6).map((i) => ({ kind: "in" as const, id: i.id, label: i.source, sub: i.category, date: i.date, amount: i.amount })),
    ...expenses.slice(0, 6).map((e) => ({ kind: "out" as const, id: e.id, label: e.description, sub: e.category, date: e.date, amount: e.cost })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const displayName = session?.user.email?.split("@")[0] ?? "There";
  const initials = displayName.slice(0, 2).toUpperCase();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 pb-6 max-w-2xl mx-auto lg:max-w-none">

      {/* ── Hero Balance Card ─────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden shadow-glow"
        style={{
          background: "linear-gradient(145deg, oklch(0.20 0.035 155), oklch(0.14 0.018 155) 60%, oklch(0.12 0.005 270))",
          border: "1px solid oklch(0.72 0.19 155 / 0.25)",
        }}
      >
        {/* Decorative glow blob */}
        <div
          className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.19 155 / 0.18) 0%, transparent 70%)", transform: "translate(30%, -30%)" }}
        />
        <div className="relative p-6">
          {/* Header row */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full gradient-primary grid place-items-center text-xs font-bold text-primary-foreground shadow-glow">
                {initials}
              </div>
              <div>
                <div className="text-xs text-white/50">{greeting}</div>
                <div className="text-sm font-semibold text-white capitalize">{displayName}</div>
              </div>
            </div>
            <button className="relative size-10 rounded-full glass grid place-items-center">
              <Bell className="size-4 text-white/70" />
              <span className="absolute top-2 right-2 size-2 rounded-full bg-emerald-400 shadow-glow" />
            </button>
          </div>

          {/* Balance */}
          <div className="text-center mb-6">
            <div className="text-xs uppercase tracking-widest text-white/40 mb-1">Total Balance</div>
            <div className="text-4xl font-bold text-white tabular-nums">{fmtMoney(totalBalance)}</div>
            {incomeMo > 0 && (
              <div className="mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium"
                style={{ background: "oklch(0.72 0.19 155 / 0.2)", color: "oklch(0.82 0.17 155)" }}>
                <ArrowUp className="size-3" />
                +{incomeMo > 0 ? ((netMo / incomeMo) * 100).toFixed(1) : "0"}% this month
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: CreditCard, label: "Add Card", action: () => openAddModal("account") },
              { icon: Send, label: "Send", action: () => openAddModal("expense") },
              { icon: Download, label: "Receive", action: () => openAddModal("income") },
              { icon: MoreHorizontal, label: "More", to: "/accounts" },
            ].map((item) => (
              item.to ? (
                <Link key={item.label} to={item.to} className="flex flex-col items-center gap-2 group">
                  <div className="size-12 rounded-2xl glass grid place-items-center group-hover:bg-primary/20 transition shadow-elegant">
                    <item.icon className="size-5 text-white/80" />
                  </div>
                  <span className="text-[11px] text-white/50">{item.label}</span>
                </Link>
              ) : (
                <button key={item.label} onClick={item.action} className="flex flex-col items-center gap-2 group">
                  <div className="size-12 rounded-2xl glass grid place-items-center group-hover:bg-primary/20 transition shadow-elegant">
                    <item.icon className="size-5 text-white/80" />
                  </div>
                  <span className="text-[11px] text-white/50">{item.label}</span>
                </button>
              )
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link to="/earnings" className="glass rounded-2xl p-4 shadow-elegant hover:shadow-glow hover:-translate-y-0.5 transition-smooth">
          <div className="size-8 rounded-xl bg-emerald-500/15 grid place-items-center mb-2">
            <ArrowDown className="size-4 text-emerald-400" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Income</div>
          <div className="text-lg font-semibold tabular-nums mt-0.5">{fmtMoney(incomeMo)}</div>
          <div className="text-[11px] text-muted-foreground">YTD {fmtMoney(incomeYr)}</div>
        </Link>

        <Link to="/expenses" className="glass rounded-2xl p-4 shadow-elegant hover:shadow-glow hover:-translate-y-0.5 transition-smooth">
          <div className="size-8 rounded-xl bg-rose-500/15 grid place-items-center mb-2">
            <ArrowUp className="size-4 text-rose-400" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Expenses</div>
          <div className="text-lg font-semibold tabular-nums mt-0.5">{fmtMoney(expenseMo)}</div>
          <div className="text-[11px] text-muted-foreground">YTD {fmtMoney(expenseYr)}</div>
        </Link>

        <Link to="/subscriptions" className="glass rounded-2xl p-4 shadow-elegant hover:shadow-glow hover:-translate-y-0.5 transition-smooth">
          <div className="size-8 rounded-xl bg-violet-500/15 grid place-items-center mb-2">
            <Repeat className="size-4 text-violet-400" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Subscriptions</div>
          <div className="text-lg font-semibold tabular-nums mt-0.5">{fmtMoney(subsCost)}</div>
          <div className="text-[11px] text-muted-foreground">{subsActive.length} active</div>
        </Link>

        <Link to="/forecast" className="glass rounded-2xl p-4 shadow-elegant hover:shadow-glow hover:-translate-y-0.5 transition-smooth">
          <div className="size-8 rounded-xl bg-amber-500/15 grid place-items-center mb-2">
            <TrendingUp className="size-4 text-amber-400" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net</div>
          <div className={`text-lg font-semibold tabular-nums mt-0.5 ${netMo >= 0 ? "text-emerald-400" : "text-rose-400"}`}>{fmtMoney(netMo)}</div>
          <div className="text-[11px] text-muted-foreground">{incomeMo > 0 ? `${Math.round((netMo / incomeMo) * 100)}% margin` : "—"}</div>
        </Link>
      </div>

      {/* ── Smart Money Challenge Widget ──────────────────────────── */}
      <SmartMoneyWidget />

      {/* ── Cash Flow Chart + Recent Activity ─────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Link to="/forecast" className="xl:col-span-2 glass rounded-2xl p-5 shadow-elegant block hover:border-primary/30 transition border border-transparent">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Cash Flow</h3>
            <ChevronRight className="size-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground mb-4">Income vs expenses · last 6 months</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.19 155)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="oklch(0.65 0.22 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 0.05)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.68 0.01 270)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.20 0.006 270)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => fmtMoney(Number(v))}
                />
                <Area type="monotone" dataKey="income" stroke="oklch(0.72 0.19 155)" strokeWidth={2.5} fill="url(#incGrad)" />
                <Area type="monotone" dataKey="expenses" stroke="oklch(0.65 0.22 25)" strokeWidth={2.5} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-500 inline-block" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-rose-500 inline-block" /> Expenses</span>
          </div>
        </Link>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Activity</h3>
            <Link to="/earnings" className="text-xs text-primary">See all</Link>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyHint />
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className={`size-8 shrink-0 grid place-items-center rounded-xl ${r.kind === "in" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                    {r.kind === "in" ? <ArrowDown className="size-3.5" /> : <ArrowUp className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.sub} · {r.date}</div>
                  </div>
                  <div className={`text-sm font-semibold tabular-nums shrink-0 ${r.kind === "in" ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.kind === "in" ? "+" : "−"}{fmtMoney(r.amount)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ── Accounts ──────────────────────────────────────────────── */}
      {accounts.length > 0 && (
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="size-4 text-primary" />
              <h3 className="font-semibold">Accounts</h3>
              <span className="text-xs text-muted-foreground">· {fmtMoney(totalBalance)} net</span>
            </div>
            <Link to="/accounts" className="text-xs text-primary inline-flex items-center gap-1">
              Manage <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {accounts.map((a) => (
              <Link
                key={a.id}
                to="/accounts/$id"
                params={{ id: a.id }}
                className="shrink-0 w-44 rounded-2xl p-4 border hover:border-primary/50 transition relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${a.color ?? "#22C55E"}18, oklch(0.18 0.006 270 / 0.8) 70%)`,
                  borderColor: `${a.color ?? "#22C55E"}30`,
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-7 rounded-lg grid place-items-center" style={{ background: `${a.color ?? "#22C55E"}25` }}>
                    <CreditCard className="size-3.5" style={{ color: a.color ?? "#22C55E" }} />
                  </div>
                  <div className="text-xs font-medium truncate">{a.name}</div>
                </div>
                <div className="text-lg font-bold tabular-nums">{a.isLiability && "−"}{fmtMoney(a.balance)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{a.type} · {a.currency}</div>
              </Link>
            ))}
            <Link
              to="/accounts"
              className="shrink-0 w-44 rounded-2xl border border-dashed border-border/60 p-4 grid place-items-center text-xs text-muted-foreground hover:text-primary hover:border-primary/50 transition"
            >
              <span className="inline-flex items-center gap-1"><Plus className="size-3.5" /> Add account</span>
            </Link>
          </div>
        </div>
      )}

      {/* ── Bottom Row: Portfolio + Goal + Wealth Shield ───────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Portfolio */}
        <Link
          to="/investments"
          className="group glass rounded-2xl p-5 shadow-elegant flex flex-col gap-3 relative overflow-hidden hover:border-primary/40 transition border border-transparent"
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(70% 70% at 100% 0%, oklch(0.72 0.19 155), transparent 70%)" }} />
          <div className="relative flex items-center justify-between">
            <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow">
              <TrendingUp className="size-5 text-primary-foreground" />
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition" />
          </div>
          <div className="relative">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Portfolio</div>
            <div className="text-xl font-bold tabular-nums mt-0.5">{fmtMoney(portfolioValue)}</div>
            <div className={`text-xs font-medium mt-0.5 ${portfolioPL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {portfolioPL >= 0 ? "▲" : "▼"} {fmtMoney(Math.abs(portfolioPL))}
              {invested > 0 && ` (${((portfolioPL / invested) * 100).toFixed(1)}%)`}
            </div>
            <div className="text-[11px] text-muted-foreground">{holdings.length} holdings</div>
          </div>
        </Link>

        {/* Monthly Goal */}
        <Link to="/goals" className="group glass rounded-2xl p-5 shadow-elegant flex flex-col gap-3 hover:border-primary/40 transition border border-transparent">
          <div className="flex items-center justify-between">
            <div className="size-10 rounded-xl bg-amber-500/15 grid place-items-center">
              <Target className="size-5 text-amber-400" />
            </div>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition" />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly Goal</div>
            <div className="text-xl font-bold tabular-nums mt-0.5">{fmtMoney(savedMo)}</div>
            <div className="text-[11px] text-muted-foreground">/ {monthlyGoal > 0 ? fmtMoney(monthlyGoal) : "set a goal"}</div>
          </div>
          <div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full gradient-primary shadow-glow transition-all" style={{ width: `${goalPct}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] text-muted-foreground">
              {monthlyGoal > 0 ? `${goalPct}% reached` : "Tap to set a savings target"}
            </div>
          </div>
        </Link>

        {/* Wealth Shield */}
        <Link
          to="/wealth-shield"
          className="group relative rounded-2xl p-5 flex flex-col gap-3 overflow-hidden hover:scale-[1.01] transition-smooth border"
          style={{
            background: "linear-gradient(135deg, oklch(0.18 0.025 155), oklch(0.14 0.010 200) 60%, oklch(0.12 0.005 270))",
            borderColor: "oklch(0.72 0.19 155 / 0.20)",
          }}
        >
          <div className="absolute inset-0 opacity-15 pointer-events-none"
            style={{ background: "radial-gradient(circle at 80% 20%, oklch(0.72 0.19 155), transparent 60%)" }} />
          <div className="relative flex items-center justify-between">
            <div className="size-10 rounded-xl grid place-items-center shadow-glow"
              style={{ background: "linear-gradient(135deg, oklch(0.72 0.19 155), oklch(0.82 0.17 155))" }}>
              <Shield className="size-5 text-primary-foreground" />
            </div>
            <ChevronRight className="size-4 text-white/40 group-hover:text-primary transition" />
          </div>
          <div className="relative">
            <div className="text-[10px] uppercase tracking-widest text-white/40">Wealth Shield</div>
            <div className="text-base font-semibold text-white mt-0.5">Protection & Safety</div>
            <div className="text-[11px] text-white/40 mt-0.5">Emergency fund · debt · net worth</div>
          </div>
        </Link>
      </div>

      {/* ── Share & Earn Banner ───────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-4 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, oklch(0.20 0.030 155), oklch(0.16 0.020 200))",
          border: "1px solid oklch(0.72 0.19 155 / 0.20)",
        }}
      >
        <div className="absolute right-0 top-0 h-full w-48 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(circle at 80% 50%, oklch(0.72 0.19 155), transparent 70%)" }} />
        <div className="relative">
          <div className="font-semibold text-white">Share &amp; Earn</div>
          <div className="text-xs text-white/50 mt-0.5">Get rewarded when your friends join</div>
        </div>
        <button className="relative shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary shadow-glow text-primary-foreground text-sm font-medium">
          <Share2 className="size-4" />
          Send Invite
        </button>
      </div>

      {/* ── Quick Links Row ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: "/analytics", icon: BarChart3, label: "Analytics", color: "bg-violet-500/15 text-violet-400" },
          { to: "/reports", icon: Receipt, label: "Reports", color: "bg-sky-500/15 text-sky-400" },
          { to: "/wealth-shield", icon: Shield, label: "Wealth Shield", color: "bg-emerald-500/15 text-emerald-400" },
          { to: "/financial-profile", icon: TrendingUp, label: "Fin Profile", color: "bg-amber-500/15 text-amber-400" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="glass rounded-2xl p-4 flex items-center gap-3 shadow-elegant hover:shadow-glow hover:-translate-y-0.5 transition-smooth"
          >
            <div className={`size-9 rounded-xl grid place-items-center shrink-0 ${item.color}`}>
              <item.icon className="size-4" />
            </div>
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Smart Money Challenge Dashboard Widget ──────────────────────────────── */
function SmartMoneyWidget() {
  const getChallengeFn = useServerFn(getActiveChallenge);
  const getStatusFn = useServerFn(getUserChallengeStatus);

  const challengeQ = useQuery({
    queryKey: ["active-challenge"],
    queryFn: () => getChallengeFn(),
    staleTime: 60_000,
  });
  const statusQ = useQuery({
    queryKey: ["user-challenge-status"],
    queryFn: () => getStatusFn(),
    staleTime: 30_000,
  });

  const challenge: any = (challengeQ.data as any)?.challenge ?? null;
  const stats: any = (challengeQ.data as any)?.stats ?? null;
  const userStatus = (statusQ.data as any)?.status ?? "not_joined";

  // Countdown
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!challenge?.end_date) return;
    const diff = new Date(challenge.end_date + "T23:59:59").getTime() - Date.now();
    setDaysLeft(diff > 0 ? Math.ceil(diff / 86_400_000) : 0);
  }, [challenge?.end_date]);

  if (!challenge || challengeQ.isLoading) return null;

  const capPct = stats ? Math.round((stats.paid / stats.cap) * 100) : 0;

  const statusLabel = {
    not_joined: null,
    joined: "You've joined — confirm completion to qualify.",
    qualified: "✓ You're qualified for the draw!",
    main_winner: "🏆 You won 3 Months Premium!",
    loser_winner: "🎉 You won 1 Month Premium!",
    payment_pending: "Payment pending.",
  }[userStatus] ?? null;

  return (
    <Link
      to="/challenges"
      className="block rounded-2xl overflow-hidden shadow-elegant hover:scale-[1.005] transition-smooth"
      style={{
        background: "linear-gradient(135deg, oklch(0.18 0.030 155), oklch(0.14 0.015 155) 55%, oklch(0.12 0.005 270))",
        border: "1px solid oklch(0.72 0.19 155 / 0.30)",
      }}
    >
      <div className="relative p-5">
        <div className="absolute top-0 right-0 w-48 h-48 pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.19 155 / 0.15) 0%, transparent 70%)", transform: "translate(25%,-25%)" }} />

        <div className="relative flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-8 rounded-xl gradient-primary grid place-items-center shadow-glow shrink-0">
                <Trophy className="size-4 text-primary-foreground" />
              </div>
              <span className="text-xs font-medium text-emerald-400">Smart Money Challenge</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "oklch(0.72 0.19 155 / 0.15)", color: "oklch(0.82 0.17 155)" }}>
                Active
              </span>
            </div>
            <div className="text-base font-bold text-white truncate">{challenge.title}</div>
            {statusLabel ? (
              <div className="text-xs text-emerald-400 mt-0.5">{statusLabel}</div>
            ) : (
              <div className="text-xs text-white/50 mt-0.5">
                Join {stats?.paid ?? 0} others · {fmtMoney(challenge.entry_fee ?? 10)} entry
              </div>
            )}
          </div>

          <div className="shrink-0 text-right">
            <div className="flex items-center gap-1 text-white/50 text-xs mb-1">
              <Crown className="size-3 text-amber-400" />
              <span className="text-amber-400 font-medium">3 Mo Premium</span>
            </div>
            {daysLeft !== null && (
              <div className="flex items-center gap-1 text-xs text-white/40">
                <Clock className="size-3" /> {daysLeft}d left
              </div>
            )}
          </div>
        </div>

        {/* Cap bar */}
        <div className="relative mt-4">
          <div className="flex justify-between text-[10px] text-white/40 mb-1">
            <span>{stats?.paid ?? 0} of {stats?.cap ?? 500} spots filled</span>
            <span className="text-white/60">Join for {fmtMoney(challenge.entry_fee ?? 10)} →</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(1 0 0 / 0.08)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${capPct}%`,
                background: "linear-gradient(90deg, oklch(0.72 0.19 155), oklch(0.82 0.17 155))",
                boxShadow: "0 0 8px oklch(0.72 0.19 155 / 0.6)",
              }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyHint() {
  return (
    <div className="text-center py-6">
      <p className="text-sm text-muted-foreground mb-3">Nothing tracked yet.</p>
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={() => openAddModal("income")} className="px-3 h-9 rounded-xl gradient-primary text-primary-foreground text-xs font-medium shadow-glow">Add income</button>
        <button onClick={() => openAddModal("expense")} className="px-3 h-9 rounded-xl border border-border text-xs">Add expense</button>
      </div>
    </div>
  );
}
