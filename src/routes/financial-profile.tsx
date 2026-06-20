import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Save, User, PiggyBank, CreditCard, Wallet, Target, Shield } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { getProfile, saveProfile } from "@/lib/investment.functions";

export const Route = createFileRoute("/financial-profile")({ component: FinancialProfilePage });

const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AUD", "CAD", "INR", "JPY", "NGN", "KES"];

type ProfileShape = {
  currency?: string | null;
  monthly_income?: number | null;
  monthly_expenses?: number | null;
  monthly_savings?: number | null;
  emergency_fund?: number | null;
  total_debt?: number | null;
  existing_investments?: number | null;
  age?: number | null;
  country?: string | null;
  knowledge_level?: string | null;
  investment_goal?: string | null;
  time_horizon?: string | null;
  risk_tolerance?: string | null;
};

function FinancialProfilePage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveProfile);

  const { data, isLoading } = useQuery({ queryKey: ["fin-profile"], queryFn: () => getFn() });
  const [form, setForm] = useState<ProfileShape>({});

  useEffect(() => { if (data?.profile) setForm(data.profile as any); }, [data?.profile]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: form as any }),
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["fin-profile"] });
      qc.invalidateQueries({ queryKey: ["inv-dash"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (k: keyof ProfileShape, v: any) => setForm((s) => ({ ...s, [k]: v }));
  const num = (k: keyof ProfileShape) => (form[k] as number | null | undefined) ?? "";

  if (isLoading) {
    return <div className="glass rounded-2xl p-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  const cur = form.currency || "ZAR";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n || 0);

  const income = Number(form.monthly_income) || 0;
  const expenses = Number(form.monthly_expenses) || 0;
  const savings = Number(form.monthly_savings) || 0;
  const debt = Number(form.total_debt) || 0;
  const ef = Number(form.emergency_fund) || 0;
  const efTarget = expenses * 6;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;
  const dti = income > 0 ? (debt / (income * 12)) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial Profile"
        subtitle="Your single source of truth — savings target, debt, income & risk. Powers the dashboard & AI."
        actions={
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="gradient-primary text-primary-foreground rounded-lg h-10 px-5 text-sm font-medium shadow-glow inline-flex items-center gap-2"
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save
          </button>
        }
      />

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon={<PiggyBank className="size-4" />} label="Savings rate" value={`${savingsRate.toFixed(1)}%`} tone={savingsRate >= 20 ? "emerald" : savingsRate >= 10 ? "amber" : "rose"} sub={`${fmt(savings)} / mo`} />
        <Stat icon={<CreditCard className="size-4" />} label="Debt-to-income" value={`${dti.toFixed(0)}%`} tone={dti < 20 ? "emerald" : dti < 40 ? "amber" : "rose"} sub={fmt(debt)} />
        <Stat icon={<Shield className="size-4" />} label="Emergency fund" value={efTarget ? `${Math.min(100, (ef / efTarget) * 100).toFixed(0)}%` : "—"} tone={ef >= efTarget && efTarget > 0 ? "emerald" : "amber"} sub={`${fmt(ef)} / ${fmt(efTarget)}`} />
        <Stat icon={<Wallet className="size-4" />} label="Net monthly" value={fmt(income - expenses)} tone={income - expenses > 0 ? "emerald" : "rose"} sub={`${fmt(income)} in · ${fmt(expenses)} out`} />
      </div>

      {/* Cash flow */}
      <Section title="Cash flow" icon={<Wallet className="size-4" />}>
        <Grid>
          <NumField label={`Monthly income (${cur})`} value={num("monthly_income")} onChange={(v) => set("monthly_income", Number(v) || 0)} />
          <NumField label={`Monthly expenses (${cur})`} value={num("monthly_expenses")} onChange={(v) => set("monthly_expenses", Number(v) || 0)} />
          <NumField label={`Monthly savings (${cur})`} value={num("monthly_savings")} onChange={(v) => set("monthly_savings", Number(v) || 0)} />
        </Grid>
      </Section>

      {/* Wealth & debt */}
      <Section title="Wealth & debt" icon={<PiggyBank className="size-4" />}>
        <Grid>
          <NumField label={`Emergency fund (${cur})`} value={num("emergency_fund")} onChange={(v) => set("emergency_fund", Number(v) || 0)} />
          <NumField label={`Total debt (${cur})`} value={num("total_debt")} onChange={(v) => set("total_debt", Number(v) || 0)} />
          <NumField label={`Existing investments (${cur})`} value={num("existing_investments")} onChange={(v) => set("existing_investments", Number(v) || 0)} />
        </Grid>
      </Section>

      {/* Personal */}
      <Section title="Personal" icon={<User className="size-4" />}>
        <Grid>
          <NumField label="Age" value={num("age")} onChange={(v) => set("age", Number(v) || 0)} />
          <TextField label="Country" value={form.country ?? ""} onChange={(v) => set("country", v)} placeholder="e.g. South Africa" />
          <SelectField label="Currency" value={cur} onChange={(v) => set("currency", v)} options={CURRENCIES} />
        </Grid>
      </Section>

      {/* Investing */}
      <Section title="Investing preferences" icon={<Target className="size-4" />}>
        <Grid>
          <SelectField label="Knowledge level" value={form.knowledge_level ?? ""} onChange={(v) => set("knowledge_level", v)} options={["", "Beginner", "Intermediate", "Advanced"]} />
          <SelectField label="Investment goal" value={form.investment_goal ?? ""} onChange={(v) => set("investment_goal", v)} options={["", "Wealth Building", "Retirement", "House Deposit", "Passive Income", "Education", "Other"]} />
          <SelectField label="Time horizon" value={form.time_horizon ?? ""} onChange={(v) => set("time_horizon", v)} options={["", "< 3 years", "3-5 years", "5-10 years", "10+ years"]} />
          <SelectField label="Risk tolerance" value={form.risk_tolerance ?? ""} onChange={(v) => set("risk_tolerance", v)} options={["", "Conservative", "Moderate", "Aggressive"]} />
        </Grid>
      </Section>

      <div className="flex justify-end">
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="gradient-primary text-primary-foreground rounded-lg h-11 px-6 text-sm font-medium shadow-glow inline-flex items-center gap-2"
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save profile
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="glass rounded-2xl p-5 sm:p-6 shadow-elegant">
      <div className="flex items-center gap-2 mb-4 text-sm font-semibold">
        <span className="size-7 rounded-lg bg-primary/10 text-primary grid place-items-center">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}
function NumField({ label, value, onChange }: { label: string; value: any; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <input type="number" inputMode="decimal" value={value ?? ""} onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </label>
  );
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 rounded-lg bg-muted/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring">
        {options.map((o) => <option key={o} value={o}>{o || "—"}</option>)}
      </select>
    </label>
  );
}
function Stat({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: "emerald"|"amber"|"rose" }) {
  const tones = {
    emerald: "from-emerald-500/15 to-emerald-500/0 text-emerald-500",
    amber: "from-amber-500/15 to-amber-500/0 text-amber-500",
    rose: "from-rose-500/15 to-rose-500/0 text-rose-500",
  } as const;
  return (
    <div className={`glass rounded-2xl p-4 shadow-elegant relative overflow-hidden bg-gradient-to-br ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
