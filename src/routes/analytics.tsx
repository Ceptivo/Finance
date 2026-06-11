import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useExpenses, useIncomes, sumByCategory } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/analytics")({ component: AnalyticsPage });

const LUXURY = ["#E6C07A", "#5BA8FF", "#A78BFA", "#34D399", "#F472B6", "#94A3B8"];

function AnalyticsPage() {
  const { items: incomes } = useIncomes();
  const { items: expenses } = useExpenses();

  const series = useMemo(() => {
    const now = new Date();
    const out: Array<{ month: string; revenue: number; expenses: number; profit: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const rev = incomes.filter((x) => x.date.startsWith(ym)).reduce((a, b) => a + b.amount, 0);
      const exp = expenses.filter((x) => x.date.startsWith(ym)).reduce((a, b) => a + b.cost, 0);
      out.push({ month: d.toLocaleString("en", { month: "short" }), revenue: rev, expenses: exp, profit: rev - exp });
    }
    return out;
  }, [incomes, expenses]);

  const sources = useMemo(
    () => sumByCategory(incomes.map((i) => ({ category: i.category, amount: i.amount })), "amount")
      .map((x) => ({ name: x.category, value: x.total })),
    [incomes],
  );

  const totalRev = sources.reduce((a, x) => a + x.value, 0);
  const empty = incomes.length + expenses.length === 0;

  return (
    <>
      <PageHeader title="Analytics" subtitle="Patterns, trends and where the money actually flows." />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Revenue Growth — kept */}
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Revenue Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(Number(v))} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#g1)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profit Growth — kept */}
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Profit Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(Number(v))} />
                <Line type="monotone" dataKey="profit" stroke="var(--color-chart-2)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-chart-2)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Premium Donut — Income Sources */}
        <div className="relative glass rounded-2xl p-6 shadow-elegant overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-60"
               style={{ background: "radial-gradient(60% 50% at 50% 30%, oklch(0.68 0.18 250 / 0.18), transparent 70%)" }} />
          <div className="relative">
            <h3 className="font-semibold tracking-tight">Income Sources</h3>
            <p className="text-xs text-muted-foreground mb-2">By category · YTD</p>
            <div className="relative h-64">
              {sources.length === 0 ? (
                <Empty />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {LUXURY.map((c, i) => (
                          <radialGradient key={i} id={`src-${i}`} cx="50%" cy="50%" r="65%">
                            <stop offset="0%" stopColor={c} stopOpacity={1} />
                            <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                          </radialGradient>
                        ))}
                      </defs>
                      <Tooltip
                        contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                        formatter={(v: number) => fmtMoney(Number(v))}
                      />
                      <Pie
                        data={sources}
                        dataKey="value"
                        innerRadius={68}
                        outerRadius={96}
                        paddingAngle={2}
                        stroke="var(--color-background)"
                        strokeWidth={2}
                      >
                        {sources.map((_, i) => <Cell key={i} fill={`url(#src-${i % LUXURY.length})`} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 grid place-items-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total</div>
                      <div className="text-2xl font-semibold tracking-tight mt-0.5">{fmtMoney(totalRev)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
            {sources.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mt-4">
                {sources.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="size-2.5 rounded-sm shrink-0" style={{ background: LUXURY[i % LUXURY.length] }} />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="font-medium tabular-nums">{fmtMoney(c.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Premium grouped bars */}
        <div className="relative glass rounded-2xl p-6 shadow-elegant overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-50"
               style={{ background: "radial-gradient(60% 50% at 80% 0%, oklch(0.78 0.16 240 / 0.15), transparent 70%)" }} />
          <div className="relative">
            <h3 className="font-semibold tracking-tight">Revenue · Expenses · Profit</h3>
            <p className="text-xs text-muted-foreground mb-2">Monthly comparison</p>
            <div className="h-64">
              {empty ? <Empty /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series} barGap={4}>
                    <defs>
                      <linearGradient id="brRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5BA8FF" stopOpacity={1} />
                        <stop offset="100%" stopColor="#5BA8FF" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="brExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F472B6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#F472B6" stopOpacity={0.4} />
                      </linearGradient>
                      <linearGradient id="brPro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E6C07A" stopOpacity={1} />
                        <stop offset="100%" stopColor="#E6C07A" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(Number(v))} />
                    <Bar dataKey="revenue" fill="url(#brRev)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="expenses" fill="url(#brExp)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="profit" fill="url(#brPro)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <Legend swatch="#5BA8FF" label="Revenue" />
              <Legend swatch="#F472B6" label="Expenses" />
              <Legend swatch="#E6C07A" label="Profit" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Empty() {
  return <div className="h-full grid place-items-center text-sm text-muted-foreground">Add income or expenses to see analytics.</div>;
}
function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      <span className="size-2.5 rounded-sm" style={{ background: swatch }} />
      {label}
    </span>
  );
}
