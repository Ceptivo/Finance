import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { useIncomes, sumByCategory, inMonth, inYear } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, DollarSign, TrendingUp, Award, Trash2 } from "lucide-react";
import { openAddModal } from "@/components/AddFAB";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/earnings")({ component: IncomePage });

function IncomePage() {
  const { items, remove } = useIncomes();
  const monthly = items.filter((e) => inMonth(e.date)).reduce((a, e) => a + e.amount, 0);
  const annual = items.filter((e) => inYear(e.date)).reduce((a, e) => a + e.amount, 0);

  const byCat = sumByCategory(items.map((i) => ({ category: i.category, amount: i.amount })), "amount");
  const largest = byCat[0];

  return (
    <>
      <PageHeader
        title="Income"
        subtitle="Every dollar coming in."
        actions={
          <Button onClick={() => openAddModal("income")} className="gradient-primary text-primary-foreground shadow-glow border-0">
            <Plus className="size-4 mr-1" /> Add Income
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Monthly Income" value={fmtMoney(monthly)} icon={DollarSign} />
        <KpiCard label="Annual Income" value={fmtMoney(annual)} icon={TrendingUp} />
        <KpiCard
          label="Largest Category"
          value={largest?.category ?? "—"}
          icon={Award}
          sub={largest ? [
            { label: "Amount", value: fmtMoney(largest.total) },
            { label: "Share", value: annual ? `${Math.round((largest.total / annual) * 100)}%` : "—" },
          ] : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Income by Category</h3>
          <div className="h-72">
            {byCat.length === 0 ? (
              <EmptyChart label="Add income to see the breakdown." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCat}>
                  <defs>
                    <linearGradient id="incBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(Number(v))} />
                  <Bar dataKey="total" fill="url(#incBar)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Recent income</h3>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing tracked yet.</p>
          ) : (
            <ul className="space-y-2">
              {items.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm py-2 border-b border-border/60 last:border-0 group">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.source}</div>
                    <div className="text-xs text-muted-foreground">{e.category} · {e.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-emerald-400">+{fmtMoney(e.amount)}</div>
                    <button onClick={() => remove(e.id)} className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition" aria-label="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
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

function EmptyChart({ label }: { label: string }) {
  return <div className="h-full grid place-items-center text-sm text-muted-foreground">{label}</div>;
}
