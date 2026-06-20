import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { StatusPill } from "@/components/StatusPill";
import { useSubs, SUB_CATEGORIES } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { Repeat, CalendarClock, TrendingUp, Bot, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openAddModal } from "@/components/AddFAB";
import { SubscriptionKiller } from "@/components/SubscriptionKiller";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/subscriptions")({ component: SubsPage });

// Premium luxury palette — gold → blue ring around a central glow
const PALETTE = [
  "#E6C07A", // champagne gold
  "#5BA8FF", // primary blue
  "#A78BFA", // amethyst
  "#34D399", // emerald
  "#F472B6", // pink
  "#94A3B8", // platinum
];

function SubsPage() {
  const { items, remove } = useSubs();

  const active = items.filter((s) => s.status === "Active");
  const totalMo = active.reduce((a, s) => a + s.monthlyCost, 0);
  const aiCost = active.filter((s) => s.category === "AI").reduce((a, s) => a + s.monthlyCost, 0);

  const byCategory = useMemo(() => {
    return SUB_CATEGORIES.map((c) => ({
      name: c,
      value: active.filter((s) => s.category === c).reduce((a, s) => a + s.monthlyCost, 0),
    })).filter((x) => x.value > 0);
  }, [active]);

  return (
    <>
      <PageHeader
        title="Subscriptions"
        subtitle="Everything you pay for monthly — AI tools, software, the lot."
        actions={
          <Button onClick={() => openAddModal("subscription")} className="gradient-primary text-primary-foreground shadow-glow border-0">
            <Plus className="size-4 mr-1" /> Add Subscription
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <KpiCard label="Total Monthly" value={fmtMoney(totalMo)} icon={Repeat} />
        <KpiCard label="Annual Cost" value={fmtMoney(totalMo * 12)} icon={TrendingUp} />
        <KpiCard
          label="AI Tools"
          value={fmtMoney(aiCost)}
          icon={Bot}
          sub={[{ label: "of total", value: totalMo ? `${Math.round((aiCost / totalMo) * 100)}%` : "—" }]}
        />
        <KpiCard label="Active" value={String(active.length)} icon={CalendarClock} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-4">
        {/* Premium Donut */}
        <div className="relative glass rounded-2xl p-6 shadow-elegant xl:col-span-1 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-60"
               style={{ background: "radial-gradient(60% 50% at 50% 30%, oklch(0.68 0.18 250 / 0.18), transparent 70%)" }} />
          <div className="relative">
            <h3 className="font-semibold tracking-tight">Spend by Category</h3>
            <p className="text-xs text-muted-foreground mb-2">Monthly · live breakdown</p>

            <div className="relative h-64">
              {byCategory.length === 0 ? (
                <div className="h-full grid place-items-center text-sm text-muted-foreground">
                  Add a subscription to see the breakdown.
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <defs>
                        {PALETTE.map((c, i) => (
                          <radialGradient key={i} id={`donut-${i}`} cx="50%" cy="50%" r="65%">
                            <stop offset="0%" stopColor={c} stopOpacity={1} />
                            <stop offset="100%" stopColor={c} stopOpacity={0.55} />
                          </radialGradient>
                        ))}
                        <filter id="donutGlow" x="-50%" y="-50%" width="200%" height="200%">
                          <feGaussianBlur stdDeviation="6" result="blur" />
                          <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                          </feMerge>
                        </filter>
                      </defs>
                      <Tooltip
                        contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }}
                        formatter={(v: number) => fmtMoney(Number(v))}
                      />
                      <Pie
                        data={byCategory}
                        dataKey="value"
                        innerRadius={68}
                        outerRadius={96}
                        paddingAngle={2}
                        stroke="var(--color-background)"
                        strokeWidth={2}
                        filter="url(#donutGlow)"
                      >
                        {byCategory.map((_, i) => (
                          <Cell key={i} fill={`url(#donut-${i % PALETTE.length})`} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 grid place-items-center pointer-events-none">
                    <div className="text-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Total / mo</div>
                      <div className="text-2xl font-semibold tracking-tight mt-0.5">{fmtMoney(totalMo)}</div>
                      <div className="text-[11px] text-muted-foreground">{fmtMoney(totalMo * 12)} / yr</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {byCategory.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mt-4">
                {byCategory.map((c, i) => (
                  <li key={c.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="size-2.5 rounded-sm shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="font-medium tabular-nums">{fmtMoney(c.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-elegant xl:col-span-2">
          <h3 className="font-semibold mb-3">All Subscriptions</h3>
          {items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground mb-3">No subscriptions tracked yet.</p>
              <Button onClick={() => openAddModal("subscription")} size="sm" className="gradient-primary text-primary-foreground border-0">
                <Plus className="size-4 mr-1" /> Add your first
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3 group">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.category} · Next {s.nextCharge}</div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <div className="font-semibold text-sm">{fmtMoney(s.monthlyCost)}<span className="text-muted-foreground text-xs">/mo</span></div>
                      <div className="text-[11px] text-muted-foreground">{fmtMoney(s.monthlyCost * 12)}/yr</div>
                    </div>
                    <StatusPill status={s.status} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => remove(s.id)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-destructive" aria-label="Delete">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <SubscriptionKiller />
    </>
  );
}
