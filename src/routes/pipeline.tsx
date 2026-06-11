import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { deals } from "@/lib/mock-data";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/pipeline")({ component: PipelinePage });

const stages = ["Lead", "Contacted", "Proposal Sent", "Negotiation", "Won", "Lost"] as const;

function PipelinePage() {
  const totalDeals = deals.length;
  const won = deals.filter((d) => d.stage === "Won").length;
  const lost = deals.filter((d) => d.stage === "Lost").length;
  const conv = ((won / Math.max(1, won + lost)) * 100).toFixed(0);

  return (
    <>
      <PageHeader
        title="Tasks & Deals"
        subtitle={`${totalDeals} active deals · Win rate ${conv}%`}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {stages.map((s) => {
          const items = deals.filter((d) => d.stage === s);
          const value = items.reduce((a, d) => a + d.value, 0);
          return (
            <div key={s} className="glass rounded-2xl p-3 shadow-elegant min-h-[280px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{s}</div>
                  <div className="text-sm font-semibold">{items.length} · {fmtMoney(value)}</div>
                </div>
                <span className="size-2 rounded-full bg-primary" />
              </div>
              <div className="space-y-2">
                {items.map((d) => (
                  <div key={d.id} className="rounded-xl p-3 bg-card/60 border border-border hover:border-primary/40 transition-smooth cursor-pointer">
                    <div className="text-sm font-medium">{d.client}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Updated {d.updated}</div>
                    <div className="mt-2 text-sm font-semibold text-gradient">{fmtMoney(d.value)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
