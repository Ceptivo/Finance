import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusPill } from "@/components/StatusPill";
import { clients } from "@/lib/mock-data";
import { fmtMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Plus, Mail, Phone } from "lucide-react";

export const Route = createFileRoute("/clients")({ component: ClientsPage });

function ClientsPage() {
  return (
    <>
      <PageHeader
        title="Clients"
        subtitle="Manage every relationship and track lifetime value."
        actions={
          <Button className="gradient-primary text-primary-foreground shadow-glow border-0">
            <Plus className="size-4 mr-1" /> Add Client
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {clients.map((c) => (
          <div key={c.id} className="glass rounded-2xl p-5 shadow-elegant transition-smooth hover:-translate-y-0.5 hover:shadow-glow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="size-11 rounded-xl gradient-primary grid place-items-center font-semibold text-primary-foreground">
                  {c.clientName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div>
                  <div className="font-semibold leading-tight">{c.clientName}</div>
                  <div className="text-xs text-muted-foreground">{c.businessName}</div>
                </div>
              </div>
              <StatusPill status={c.status} />
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Mail className="size-3.5" /> {c.email}</div>
              <div className="flex items-center gap-2"><Phone className="size-3.5" /> {c.phone}</div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-border">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MRR</div>
                <div className="text-sm font-semibold">{fmtMoney(c.monthlySubscription)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Lifetime</div>
                <div className="text-sm font-semibold text-gradient">{fmtMoney(c.totalRevenue)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Last Payment</div>
                <div className="text-xs">{c.lastPaymentDate}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Next Payment</div>
                <div className="text-xs">{c.nextPaymentDate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-5 shadow-elegant mt-6">
        <h3 className="font-semibold mb-4">All Clients</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="py-2">Client</th>
                <th>Business</th>
                <th>MRR</th>
                <th>One-time</th>
                <th>Lifetime</th>
                <th>Next Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-border/60 hover:bg-accent/30 transition-smooth">
                  <td className="py-3 font-medium">{c.clientName}</td>
                  <td className="text-muted-foreground">{c.businessName}</td>
                  <td>{fmtMoney(c.monthlySubscription)}</td>
                  <td>{fmtMoney(c.oneTimeRevenue)}</td>
                  <td className="font-semibold">{fmtMoney(c.totalRevenue)}</td>
                  <td className="text-muted-foreground">{c.nextPaymentDate}</td>
                  <td><StatusPill status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
