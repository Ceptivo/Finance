import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { useExpenses, sumByCategory, inMonth, inYear } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Receipt, TrendingDown, Award, Camera, Trash2 } from "lucide-react";
import { openAddModal } from "@/components/AddFAB";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  const { items, remove } = useExpenses();
  const monthly = items.filter((e) => inMonth(e.date)).reduce((a, e) => a + e.cost, 0);
  const annual = items.filter((e) => inYear(e.date)).reduce((a, e) => a + e.cost, 0);

  const byCat = sumByCategory(items.map((i) => ({ category: i.category, cost: i.cost })), "cost");
  const largest = byCat[0];

  return (
    <>
      <PageHeader
        title="Expenses"
        subtitle="Every cost behind the lifestyle."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openAddModal("receipt")}>
              <Camera className="size-4 mr-1" /> Scan
            </Button>
            <Button onClick={() => openAddModal("expense")} className="gradient-primary text-primary-foreground shadow-glow border-0">
              <Plus className="size-4 mr-1" /> Add Expense
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Monthly Expenses" value={fmtMoney(monthly)} icon={Receipt} />
        <KpiCard label="Annual Expenses" value={fmtMoney(annual)} icon={TrendingDown} />
        <KpiCard
          label="Largest Category"
          value={largest?.category ?? "—"}
          icon={Award}
          sub={largest ? [
            { label: "Spend", value: fmtMoney(largest.total) },
            { label: "Share", value: annual ? `${Math.round((largest.total / annual) * 100)}%` : "—" },
          ] : undefined}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Spend by Category</h3>
          <div className="h-72">
            {byCat.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Add an expense to see the breakdown.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCat}>
                  <defs>
                    <linearGradient id="expBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={1} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} angle={-15} textAnchor="end" height={60} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(Number(v))} />
                  <Bar dataKey="total" fill="url(#expBar)" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Recent expenses</h3>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing tracked yet.</p>
          ) : (
            <ul className="space-y-2">
              {items.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm py-2 border-b border-border/60 last:border-0 group">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{e.description}</div>
                    <div className="text-xs text-muted-foreground">{e.category} · {e.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-rose-400">−{fmtMoney(e.cost)}</div>
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
