import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet, Repeat, Sparkles, Loader2, GraduationCap,
  LayoutDashboard, Briefcase, DollarSign, Receipt, BarChart3, LineChart as LineIcon, CheckCircle2, AlertTriangle, Target, RefreshCw,
} from "lucide-react";
import { getStatement } from "@/lib/past-statements.functions";
import { generateCoachingReport } from "@/lib/coaching.functions";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";

export const Route = createFileRoute("/past-finances/$id")({ component: StatementDetail });

function fmt(n: number, cur = "USD") {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n); }
  catch { return `${cur} ${Math.round(n).toLocaleString()}`; }
}

const COLORS = ["#3B82F6","#10B981","#F59E0B","#EC4899","#8B5CF6","#06B6D4","#EF4444","#84CC16","#F97316","#14B8A6"];

function StatementDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getStatement);
  const coachFn = useServerFn(generateCoachingReport);
  const { data, isLoading } = useQuery({
    queryKey: ["past-statement", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const coach = useMutation({
    mutationFn: () => coachFn({ data: { id } }),
    onSuccess: () => { toast.success("Coaching report ready"); qc.invalidateQueries({ queryKey: ["past-statement", id] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = data?.item;
  const parsed = (s?.parsed ?? {}) as any;
  const txs: any[] = parsed.transactions ?? [];
  const accounts: any[] = parsed.accounts ?? [];
  const subs: any[] = parsed.subscriptions ?? [];
  const cur = s?.currency ?? "USD";
  const coaching = (s?.coaching ?? null) as any;

  const incomes = useMemo(() => txs.filter(t => t.type === "income"), [txs]);
  const expenses = useMemo(() => txs.filter(t => t.type === "expense"), [txs]);
  const businesses = useMemo(
    () => txs.filter(t => String(t.category || "").toLowerCase() === "business"),
    [txs],
  );

  const byCategory = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of expenses) m.set(t.category || "Other", (m.get(t.category || "Other") ?? 0) + Number(t.amount || 0));
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const byDay = useMemo(() => {
    const m = new Map<string, { date: string; income: number; expense: number }>();
    for (const t of txs) {
      const d = t.date || "";
      if (!d) continue;
      const e = m.get(d) ?? { date: d, income: 0, expense: 0 };
      if (t.type === "income") e.income += Number(t.amount || 0); else e.expense += Number(t.amount || 0);
      m.set(d, e);
    }
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [txs]);

  const cashflow = useMemo(() => {
    let bal = 0;
    return byDay.map(d => { bal += d.income - d.expense; return { date: d.date, balance: bal, net: d.income - d.expense }; });
  }, [byDay]);

  const topMerchants = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of expenses) m.set(t.description || "Unknown", (m.get(t.description || "Unknown") ?? 0) + Number(t.amount || 0));
    return Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [expenses]);

  const totalSubMonthly = useMemo(
    () => subs.reduce((sum, x) => sum + (x.cycle === "yearly" ? Number(x.amount || 0) / 12 : Number(x.amount || 0)), 0),
    [subs],
  );

  if (isLoading) return <div className="glass rounded-2xl p-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  if (!s) return <div className="text-muted-foreground">Not found.</div>;

  const tt = {
    contentStyle: {
      background: "hsl(var(--popover))",
      border: "1px solid hsl(var(--border))",
      borderRadius: 12,
      boxShadow: "0 10px 30px -10px rgb(0 0 0 / 0.3)",
      fontSize: 12,
    },
  };

  return (
    <div className="space-y-5">
      <Link to="/past-finances" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Past Finances
      </Link>

      <PageHeader
        title={s.label}
        subtitle={`${s.period_start ?? "—"} → ${s.period_end ?? "—"} · sandboxed view`}
        actions={
          <button
            onClick={() => coach.mutate()}
            disabled={coach.isPending}
            className="gradient-primary text-primary-foreground rounded-lg h-10 px-4 text-sm font-medium shadow-glow inline-flex items-center gap-2"
          >
            {coach.isPending ? <Loader2 className="size-4 animate-spin" /> : <GraduationCap className="size-4" />}
            {coaching ? "Refresh coaching" : "Generate coaching"}
          </button>
        }
      />

      <Tabs defaultValue="dashboard">
        <div className="-mx-1 px-1 overflow-x-auto no-scrollbar mb-4">
          <TabsList className="inline-flex h-auto gap-1 bg-muted/40 w-max">
            <TabsTrigger value="dashboard"><LayoutDashboard className="size-3.5 mr-1.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="coaching"><GraduationCap className="size-3.5 mr-1.5" />AI Coaching</TabsTrigger>
            <TabsTrigger value="accounts"><Wallet className="size-3.5 mr-1.5" />Accounts</TabsTrigger>
            <TabsTrigger value="businesses"><Briefcase className="size-3.5 mr-1.5" />Businesses</TabsTrigger>
            <TabsTrigger value="income"><DollarSign className="size-3.5 mr-1.5" />Income</TabsTrigger>
            <TabsTrigger value="expenses"><Receipt className="size-3.5 mr-1.5" />Expenses</TabsTrigger>
            <TabsTrigger value="subscriptions"><Repeat className="size-3.5 mr-1.5" />Subscriptions</TabsTrigger>
            <TabsTrigger value="analytics"><BarChart3 className="size-3.5 mr-1.5" />Analytics</TabsTrigger>
            <TabsTrigger value="cashflow"><LineIcon className="size-3.5 mr-1.5" />Cash Flow</TabsTrigger>
          </TabsList>
        </div>

        {/* DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi label="Income" value={fmt(Number(s.total_income), cur)} icon={<TrendingUp className="size-4" />} tone="emerald" />
            <Kpi label="Expenses" value={fmt(Number(s.total_expense), cur)} icon={<TrendingDown className="size-4" />} tone="rose" />
            <Kpi label="Net" value={fmt(Number(s.net), cur)} icon={<Wallet className="size-4" />} tone={Number(s.net) >= 0 ? "blue" : "rose"} />
            <Kpi label="Subs / mo" value={fmt(totalSubMonthly, cur)} icon={<Repeat className="size-4" />} tone="violet" sub={`${subs.length} recurring`} />
          </div>

          {coaching && (
            <div className="glass rounded-2xl p-5 border border-primary/30 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: "radial-gradient(60% 50% at 0% 0%, var(--color-primary), transparent 60%)" }} />
              <div className="relative flex items-start gap-4 flex-wrap">
                <div className="size-14 rounded-2xl gradient-primary grid place-items-center text-2xl font-bold text-primary-foreground shadow-glow">
                  {coaching.overall_grade}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">AI verdict</div>
                  <div className="text-sm mt-0.5">{coaching.summary}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-emerald-500/10 px-3 py-2 border border-emerald-500/20">
                    <div className="text-[10px] uppercase text-emerald-500">Could save / mo</div>
                    <div className="text-lg font-bold text-emerald-500 tabular-nums">{fmt(Number(coaching.potential_monthly_savings) || 0, cur)}</div>
                  </div>
                  <div className="rounded-xl bg-primary/10 px-3 py-2 border border-primary/20">
                    <div className="text-[10px] uppercase text-primary">Per year</div>
                    <div className="text-lg font-bold text-primary tabular-nums">{fmt(Number(coaching.potential_yearly_savings) || 0, cur)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {s.insights && !coaching && (
            <div className="glass rounded-2xl p-5 border border-border/60">
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                <Sparkles className="size-4 text-primary" /> Quick insights
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.insights}</p>
            </div>
          )}

          <div className="glass rounded-2xl p-5">
            <div className="text-sm font-semibold mb-3">Income vs Expense (by day)</div>
            <div className="h-64">
              <ResponsiveContainer>
                <AreaChart data={byDay}>
                  <defs>
                    <linearGradient id="inc" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="exp" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#inc)" />
                  <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fill="url(#exp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass rounded-2xl p-5">
            <div className="text-sm font-semibold mb-3">Where the money went</div>
            <div className="space-y-2">
              {byCategory.slice(0, 8).map((c, i) => {
                const max = byCategory[0]?.value || 1;
                return (
                  <div key={c.name} className="text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        {c.name}
                      </span>
                      <span className="font-semibold tabular-nums">{fmt(c.value, cur)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(c.value / max) * 100}%`, background: `linear-gradient(90deg, ${COLORS[i % COLORS.length]}, ${COLORS[i % COLORS.length]}88)` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* COACHING */}
        <TabsContent value="coaching" className="space-y-5">
          {!coaching ? (
            <div className="glass rounded-2xl p-10 text-center border border-dashed border-border space-y-4">
              <div className="size-14 rounded-2xl gradient-primary grid place-items-center mx-auto shadow-glow">
                <GraduationCap className="size-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">No coaching report yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  Get a full AI breakdown: how much you could have saved, where to cut back, subscription audit, behavioral patterns and a concrete action plan.
                </p>
              </div>
              <button
                onClick={() => coach.mutate()}
                disabled={coach.isPending}
                className="gradient-primary text-primary-foreground rounded-lg h-11 px-6 text-sm font-medium shadow-glow inline-flex items-center gap-2"
              >
                {coach.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Generate coaching report
              </button>
            </div>
          ) : (
            <>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="glass rounded-2xl p-5 text-center bg-gradient-to-br from-primary/15 to-transparent">
                  <div className="text-xs uppercase text-muted-foreground">Overall grade</div>
                  <div className="text-6xl font-bold gradient-primary bg-clip-text text-transparent mt-2">{coaching.overall_grade}</div>
                  <div className="text-xs text-muted-foreground mt-2">{coaching.summary}</div>
                </div>
                <div className="glass rounded-2xl p-5 bg-gradient-to-br from-emerald-500/15 to-transparent">
                  <div className="text-xs uppercase text-emerald-500">Potential savings</div>
                  <div className="text-3xl font-bold mt-2 tabular-nums">{fmt(Number(coaching.potential_monthly_savings) || 0, cur)}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-sm text-muted-foreground mt-1 tabular-nums">{fmt(Number(coaching.potential_yearly_savings) || 0, cur)} per year</div>
                  <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, ((Number(coaching.potential_monthly_savings) || 0) / Math.max(1, Number(s.total_expense))) * 100)}%` }} />
                  </div>
                </div>
                <div className="glass rounded-2xl p-5">
                  <button onClick={() => coach.mutate()} disabled={coach.isPending}
                    className="w-full text-xs inline-flex items-center justify-center gap-1 px-3 h-8 rounded-md bg-accent hover:bg-accent/80 mb-3">
                    {coach.isPending ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Regenerate
                  </button>
                  <div className="text-xs uppercase text-muted-foreground mb-2">Quick wins</div>
                  <ul className="text-sm space-y-1.5">
                    {(coaching.top_wins ?? []).slice(0, 3).map((w: string, i: number) => (
                      <li key={i} className="flex gap-2"><CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />{w}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <AlertTriangle className="size-4 text-amber-500" /> Where you went wrong
                  </div>
                  <ul className="space-y-2 text-sm">
                    {(coaching.top_mistakes ?? []).map((m: string, i: number) => (
                      <li key={i} className="flex gap-2 text-muted-foreground"><span className="text-amber-500">•</span>{m}</li>
                    ))}
                  </ul>
                </div>
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold mb-3">
                    <Target className="size-4 text-primary" /> Action plan
                  </div>
                  <ol className="space-y-2 text-sm">
                    {(coaching.action_plan ?? []).map((a: string, i: number) => (
                      <li key={i} className="flex gap-2"><span className="size-5 rounded-full bg-primary/15 text-primary text-[11px] font-bold grid place-items-center shrink-0">{i+1}</span>{a}</li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="glass rounded-2xl p-5">
                <div className="text-sm font-semibold mb-3">Where you can cut back</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(coaching.cut_back ?? []).map((c: any, i: number) => (
                    <div key={i} className="rounded-xl border border-border/60 bg-card/40 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{c.category}</span>
                        <span className="text-xs text-emerald-500 font-medium tabular-nums">save {fmt(Number(c.saves) || 0, cur)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular-nums mb-2">
                        <span>{fmt(Number(c.current) || 0, cur)}</span>
                        <span>→</span>
                        <span className="text-emerald-500 font-medium">{fmt(Number(c.suggested) || 0, cur)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${c.current > 0 ? Math.min(100, (c.suggested / c.current) * 100) : 0}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{c.why}</p>
                    </div>
                  ))}
                </div>
              </div>

              {coaching.subscription_audit?.length > 0 && (
                <div className="glass rounded-2xl p-5">
                  <div className="text-sm font-semibold mb-3">Subscription audit</div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {coaching.subscription_audit.map((s: any, i: number) => (
                      <div key={i} className="rounded-lg border border-border/60 p-3 text-sm flex items-start gap-2">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                          s.verdict === "cancel" ? "bg-rose-500/15 text-rose-500" :
                          s.verdict === "review" ? "bg-amber-500/15 text-amber-500" :
                          "bg-emerald-500/15 text-emerald-500"}`}>{s.verdict}</span>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.reason}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {coaching.behavior_patterns?.length > 0 && (
                <div className="glass rounded-2xl p-5">
                  <div className="text-sm font-semibold mb-3">Behavior patterns</div>
                  <ul className="grid sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    {coaching.behavior_patterns.map((b: string, i: number) => (
                      <li key={i} className="rounded-lg border border-border/40 p-3">{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {coaching.pep_talk && (
                <div className="rounded-2xl p-5 text-center bg-gradient-to-r from-primary/15 via-emerald-500/10 to-primary/15 border border-primary/20">
                  <Sparkles className="size-5 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium italic">"{coaching.pep_talk}"</p>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* ACCOUNTS */}
        <TabsContent value="accounts">
          {accounts.length === 0 ? <Empty msg="No accounts detected in this statement." /> : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {accounts.map((a, i) => (
                <div key={i} className="glass rounded-2xl p-5 shadow-elegant">
                  <div className="text-xs uppercase text-muted-foreground">{a.type}</div>
                  <div className="font-semibold mt-0.5">{a.name}</div>
                  <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{fmt(Number(a.closing_balance || 0), cur)}</div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="businesses"><TxTable rows={businesses} cur={cur} emptyMsg="No business-related transactions detected." /></TabsContent>
        <TabsContent value="income"><TxTable rows={incomes} cur={cur} emptyMsg="No income detected." /></TabsContent>
        <TabsContent value="expenses"><TxTable rows={expenses} cur={cur} emptyMsg="No expenses detected." /></TabsContent>

        <TabsContent value="subscriptions">
          {subs.length === 0 ? <Empty msg="No recurring subscriptions detected." /> : (
            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[420px]">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Cycle</th><th className="text-right p-3">Amount</th></tr>
                  </thead>
                  <tbody>
                    {subs.map((sub, i) => (
                      <tr key={i} className="border-t border-border/50">
                        <td className="p-3 font-medium">{sub.name}</td>
                        <td className="p-3 capitalize text-muted-foreground">{sub.cycle}</td>
                        <td className="p-3 text-right tabular-nums font-semibold">{fmt(Number(sub.amount || 0), cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <div className="text-sm font-semibold mb-3">Spend by category</div>
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={3}>
                      {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip {...tt} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="glass rounded-2xl p-5">
              <div className="text-sm font-semibold mb-3">Top merchants</div>
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={topMerchants} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip {...tt} />
                    <Bar dataKey="value" radius={[0,8,8,0]}>
                      {topMerchants.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="cashflow" className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <div className="text-sm font-semibold mb-3">Running balance</div>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={cashflow}>
                  <defs>
                    <linearGradient id="bal" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Area type="monotone" dataKey="balance" stroke="#3B82F6" strokeWidth={2.5} fill="url(#bal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="text-sm font-semibold mb-3">Daily net</div>
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={cashflow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip {...tt} />
                  <Line type="monotone" dataKey="net" stroke="#10B981" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TxTable({ rows, cur, emptyMsg }: { rows: any[]; cur: string; emptyMsg: string }) {
  if (rows.length === 0) return <Empty msg={emptyMsg} />;
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[520px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left p-3">Date</th>
              <th className="text-left p-3">Description</th>
              <th className="text-left p-3">Category</th>
              <th className="text-right p-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                <td className="p-3 whitespace-nowrap text-muted-foreground">{t.date}</td>
                <td className="p-3 font-medium">{t.description}</td>
                <td className="p-3 text-muted-foreground">{t.category}</td>
                <td className={`p-3 text-right font-semibold whitespace-nowrap tabular-nums ${t.type === "income" ? "text-emerald-500" : "text-rose-500"}`}>
                  {t.type === "income" ? "+" : "−"}{fmt(Number(t.amount || 0), cur)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground border border-dashed border-border">{msg}</div>;
}

function Kpi({ label, value, icon, tone, sub }: { label: string; value: string; icon: React.ReactNode; tone: "emerald"|"rose"|"blue"|"violet"; sub?: string }) {
  const tones: Record<string, string> = {
    emerald: "from-emerald-500/15 to-transparent text-emerald-500",
    rose: "from-rose-500/15 to-transparent text-rose-500",
    blue: "from-blue-500/15 to-transparent text-blue-500",
    violet: "from-violet-500/15 to-transparent text-violet-500",
  };
  return (
    <div className={`glass rounded-2xl p-4 shadow-elegant bg-gradient-to-br ${tones[tone]} hover:-translate-y-0.5 transition-smooth`}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="size-7 rounded-lg bg-background/40 grid place-items-center">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
