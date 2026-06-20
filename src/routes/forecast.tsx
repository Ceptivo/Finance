import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { earnings, subscriptions, totals } from "@/lib/mock-data";
import { fmtMoney } from "@/lib/format";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/forecast")({ component: ForecastPage });

function ForecastPage() {
  const expectedIncome = totals.mrrNext + 4200; // recurring + projected one-time
  const expectedExpenses = totals.expenseMonth + 80;
  const predictedProfit = expectedIncome - expectedExpenses;
  const overdue = earnings.filter((e) => e.status === "Overdue" || e.status === "Pending");

  return (
    <>
      <PageHeader title="Cash Flow Forecast" subtitle="What next month is likely to look like." />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Expected Income" value={fmtMoney(expectedIncome)} icon={TrendingUp} />
        <KpiCard label="Expected Expenses" value={fmtMoney(expectedExpenses)} icon={TrendingDown} />
        <KpiCard label="Predicted Profit" value={fmtMoney(predictedProfit)} icon={Wallet} />
        <KpiCard label="Outstanding Invoices" value={String(overdue.length)} icon={AlertTriangle} sub={[{ label: "Value", value: fmtMoney(overdue.reduce((a, e) => a + e.amount, 0)) }, { label: "Oldest", value: overdue[0]?.date ?? "—" }]} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Upcoming Subscription Renewals</h3>
          <ul className="divide-y divide-border">
            {subscriptions.filter((s) => s.status === "Active").map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{s.client}</div>
                  <div className="text-xs text-muted-foreground">{s.type} · renews {s.renewalDate}</div>
                </div>
                <div className="font-semibold">{fmtMoney(s.monthlyFee)}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Outstanding Invoices</h3>
          {overdue.length === 0 ? (
            <p className="text-sm text-muted-foreground">All clear — no overdue invoices.</p>
          ) : (
            <ul className="divide-y divide-border">
              {overdue.map((e) => (
                <li key={e.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{e.clientName}</div>
                    <div className="text-xs text-muted-foreground">{e.id} · {e.date} · {e.status}</div>
                  </div>
                  <div className={`font-semibold ${e.status === "Overdue" ? "text-destructive" : ""}`}>{fmtMoney(e.amount)}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
