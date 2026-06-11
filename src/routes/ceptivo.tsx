import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { earnings } from "@/lib/mock-data";
import { fmtMoney } from "@/lib/format";
import { Sparkles, Globe, Bot, Calendar } from "lucide-react";

export const Route = createFileRoute("/ceptivo")({ component: CeptivoPage });

const websiteServices: Array<NonNullable<typeof earnings[number]["serviceType"]>> = [
  "Website Design", "Website Hosting", "Website Maintenance",
];
const aiServices: Array<NonNullable<typeof earnings[number]["serviceType"]>> = [
  "AI Automation", "AI WhatsApp Assistant",
];

function CeptivoPage() {
  const today = "2026-05-28";
  const weekStart = "2026-05-23";
  const monthPrefix = "2026-05";

  const revToday = earnings.filter((e) => e.date === today).reduce((a, e) => a + e.amount, 0);
  const revWeek = earnings.filter((e) => e.date >= weekStart).reduce((a, e) => a + e.amount, 0);
  const revMonth = earnings.filter((e) => e.date.startsWith(monthPrefix)).reduce((a, e) => a + e.amount, 0);
  const revYear = earnings.filter((e) => e.date.startsWith("2026")).reduce((a, e) => a + e.amount, 0);

  const website = earnings.filter((e) => websiteServices.includes(e.serviceType));
  const ai = earnings.filter((e) => aiServices.includes(e.serviceType));

  const websiteDesign = website.filter((e) => e.serviceType === "Website Design").reduce((a, e) => a + e.amount, 0);
  const websiteHosting = website.filter((e) => e.serviceType === "Website Hosting").reduce((a, e) => a + e.amount, 0);
  const websiteMaintenance = website.filter((e) => e.serviceType === "Website Maintenance").reduce((a, e) => a + e.amount, 0);

  const aiSetup = ai.filter((e) => e.amount >= 500).reduce((a, e) => a + e.amount, 0);
  const aiSub = ai.filter((e) => e.amount < 500).reduce((a, e) => a + e.amount, 0);

  return (
    <>
      <PageHeader
        title="Ceptivo Business"
        subtitle="Your flagship brand · websites + AI automation."
        actions={
          <div className="glass px-3 py-1.5 rounded-full text-xs flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" /> Premium tier
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Revenue Today" value={fmtMoney(revToday)} icon={Calendar} />
        <KpiCard label="Revenue This Week" value={fmtMoney(revWeek)} icon={Calendar} />
        <KpiCard label="Revenue This Month" value={fmtMoney(revMonth)} icon={Calendar} />
        <KpiCard label="Revenue This Year" value={fmtMoney(revYear)} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-accent grid place-items-center"><Globe className="size-5 text-accent-foreground" /></div>
            <div>
              <h3 className="font-semibold">Website Clients</h3>
              <p className="text-xs text-muted-foreground">Design + recurring hosting & maintenance</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl p-3 bg-card/60 border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Design</div>
              <div className="font-semibold">{fmtMoney(websiteDesign)}</div>
            </div>
            <div className="rounded-xl p-3 bg-card/60 border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hosting</div>
              <div className="font-semibold">{fmtMoney(websiteHosting)}</div>
            </div>
            <div className="rounded-xl p-3 bg-card/60 border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Maintenance</div>
              <div className="font-semibold">{fmtMoney(websiteMaintenance)}</div>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {website.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{e.businessName}</div>
                  <div className="text-xs text-muted-foreground">{e.serviceType}</div>
                </div>
                <div className="font-semibold">{fmtMoney(e.amount)}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-accent grid place-items-center"><Bot className="size-5 text-accent-foreground" /></div>
            <div>
              <h3 className="font-semibold">AI Automation Clients</h3>
              <p className="text-xs text-muted-foreground">Setup fees + monthly subscriptions</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-3 bg-card/60 border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Setup Fees</div>
              <div className="font-semibold">{fmtMoney(aiSetup)}</div>
            </div>
            <div className="rounded-xl p-3 bg-card/60 border border-border">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Monthly Subs</div>
              <div className="font-semibold">{fmtMoney(aiSub)}</div>
            </div>
          </div>
          <ul className="divide-y divide-border">
            {ai.slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{e.businessName}</div>
                  <div className="text-xs text-muted-foreground">{e.serviceType}</div>
                </div>
                <div className="font-semibold">{fmtMoney(e.amount)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
