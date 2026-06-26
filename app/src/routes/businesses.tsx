import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { businesses } from "@/lib/mock-data";
import { fmtMoney } from "@/lib/format";
import { Briefcase, TrendingUp, Repeat, ArrowUpRight } from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/businesses")({ component: BusinessesPage });

function BusinessesPage() {
  const totalMonth = businesses.reduce((a, b) => a + b.revenueMonth, 0);
  const totalYear = businesses.reduce((a, b) => a + b.revenueYear, 0);
  const totalMrr = businesses.reduce((a, b) => a + b.mrr, 0);

  return (
    <>
      <PageHeader
        title="My Businesses"
        subtitle="Every income stream you run, side-by-side."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Combined Revenue (mo)" value={fmtMoney(totalMonth)} icon={Briefcase} delta={18.2} />
        <KpiCard label="Combined YTD" value={fmtMoney(totalYear)} icon={TrendingUp} delta={42.0} />
        <KpiCard label="Combined MRR" value={fmtMoney(totalMrr)} icon={Repeat} delta={9.1} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {businesses.map((b) => (
          <Link
            key={b.id}
            to="/businesses/$id"
            params={{ id: b.id }}
            className="glass rounded-2xl p-5 shadow-elegant hover:shadow-glow transition-smooth group"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{b.category}</div>
                <h3 className="font-semibold text-lg mt-1">{b.name}</h3>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-primary/30 text-primary bg-primary/10">
                {b.status}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{b.description}</p>

            <div className="grid grid-cols-3 gap-2 mt-4">
              <div className="rounded-lg p-2 bg-card/60 border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Month</div>
                <div className="text-sm font-semibold">{fmtMoney(b.revenueMonth)}</div>
              </div>
              <div className="rounded-lg p-2 bg-card/60 border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">YTD</div>
                <div className="text-sm font-semibold">{fmtMoney(b.revenueYear)}</div>
              </div>
              <div className="rounded-lg p-2 bg-card/60 border border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MRR</div>
                <div className="text-sm font-semibold">{fmtMoney(b.mrr)}</div>
              </div>
            </div>

            <div className="h-16 mt-4 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={b.trend}>
                  <defs>
                    <linearGradient id={`grad-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" strokeWidth={2} fill={`url(#grad-${b.id})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-3 flex items-center justify-end text-xs text-primary group-hover:underline">
              Open analytics <ArrowUpRight className="size-3.5 ml-1" />
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
