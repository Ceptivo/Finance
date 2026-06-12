import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { businesses, earnings } from "@/lib/mock-data";
import { fmtMoney } from "@/lib/format";
import {
  ArrowLeft, DollarSign, Repeat, TrendingUp, Percent,
} from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart,
} from "recharts";

export const Route = createFileRoute("/businesses/$id")({
  component: BusinessDetail,
  notFoundComponent: () => (
    <div className="p-8">
      <Link to="/businesses" className="text-sm text-primary">← Back to businesses</Link>
      <p className="mt-4">Business not found.</p>
    </div>
  ),
  loader: ({ params }) => {
    const b = businesses.find((x) => x.id === params.id);
    if (!b) throw notFound();
    return b;
  },
});

function BusinessDetail() {
  const b = Route.useLoaderData();
  const recent = earnings.slice(0, 5);

  return (
    <>
      <Link to="/businesses" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2">
        <ArrowLeft className="size-4" /> All businesses
      </Link>
      <PageHeader title={b.name} subtitle={b.description} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Revenue (mo)" value={fmtMoney(b.revenueMonth)} icon={DollarSign} delta={14.2} />
        <KpiCard label="Revenue YTD" value={fmtMoney(b.revenueYear)} icon={TrendingUp} delta={38.5} />
        <KpiCard label="MRR" value={fmtMoney(b.mrr)} icon={Repeat} />
        <KpiCard label="Profit Margin" value={`${Math.round(b.profitMargin * 100)}%`} icon={Percent} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-1">Revenue Trend</h3>
          <p className="text-xs text-muted-foreground mb-3">Last 6 months</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={b.trend}>
                <defs>
                  <linearGradient id="bizrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#bizrev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-1">Monthly Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-3">Per month, this business</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={b.trend}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
                <Bar dataKey="revenue" fill="var(--color-chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5 shadow-elegant mt-4">
        <h3 className="font-semibold mb-3">Recent Transactions</h3>
        <ul className="divide-y divide-border">
          {recent.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <div className="font-medium">{e.serviceType}</div>
                <div className="text-xs text-muted-foreground">{e.date}</div>
              </div>
              <div className="font-semibold">{fmtMoney(e.amount)}</div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
