import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import {
  ShieldCheck, Plus, Trash2, TrendingDown, AlertTriangle, CheckCircle2,
  CreditCard, Home, Car, Heart, Briefcase, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/wealth-shield")({ component: WealthShieldPage });

type DebtEntry = {
  id: string;
  name: string;
  type: string;
  balance: number;
  interest_rate: number;
  min_payment: number;
  due_date: string | null;
};

const DEBT_TYPES = [
  { value: "credit_card", label: "Credit Card", icon: CreditCard },
  { value: "home_loan", label: "Home Loan", icon: Home },
  { value: "vehicle", label: "Vehicle Finance", icon: Car },
  { value: "personal", label: "Personal Loan", icon: Briefcase },
  { value: "medical", label: "Medical Debt", icon: Heart },
  { value: "other", label: "Other", icon: TrendingDown },
];

async function fetchDebts() {
  const { data, error } = await supabase
    .from("debts")
    .select("*")
    .order("interest_rate", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DebtEntry[];
}

function WealthShieldPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [strategy, setStrategy] = useState<"avalanche" | "snowball">("avalanche");

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ["wealth-shield-debts"],
    queryFn: fetchDebts,
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("debts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wealth-shield-debts"] });
      toast.success("Debt removed");
    },
    onError: () => toast.error("Failed to remove debt"),
  });

  const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
  const totalMinPayment = debts.reduce((s, d) => s + d.min_payment, 0);
  const avgRate = debts.length
    ? debts.reduce((s, d) => s + d.interest_rate, 0) / debts.length
    : 0;

  const sorted = useMemo(() => {
    if (strategy === "avalanche") {
      return [...debts].sort((a, b) => b.interest_rate - a.interest_rate);
    }
    return [...debts].sort((a, b) => a.balance - b.balance);
  }, [debts, strategy]);

  const debtFreeScore = Math.max(0, Math.min(100, 100 - Math.round((totalDebt / 1_000_000) * 100)));

  return (
    <>
      <PageHeader
        title="Wealth Shield"
        subtitle="Track debt, crush it strategically, and protect your financial future."
        actions={
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 h-10 px-4 rounded-2xl gradient-primary text-black font-semibold shadow-glow text-sm transition hover:scale-[1.02]"
          >
            <Plus className="size-4" /> Add Debt
          </button>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiTile label="Total Debt" value={fmtMoney(totalDebt)} icon={TrendingDown} accent="rose" />
        <KpiTile label="Min. Monthly" value={fmtMoney(totalMinPayment)} icon={CreditCard} accent="amber" />
        <KpiTile label="Avg. Interest" value={`${avgRate.toFixed(1)}%`} icon={AlertTriangle} accent="amber" />
        <KpiTile label="Debt-Free Score" value={`${debtFreeScore}/100`} icon={ShieldCheck} accent="emerald" />
      </div>

      {/* Debt-free score bar */}
      <div className="glass rounded-3xl p-5 shadow-elegant mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40">Financial Shield Score</div>
            <div className="text-2xl font-bold text-white mt-0.5">{debtFreeScore} <span className="text-sm font-normal text-white/40">/ 100</span></div>
          </div>
          <div className={`size-12 rounded-2xl grid place-items-center ${debtFreeScore >= 70 ? "bg-emerald-500/15" : debtFreeScore >= 40 ? "bg-amber-500/15" : "bg-rose-500/15"}`}>
            <ShieldCheck className={`size-5 ${debtFreeScore >= 70 ? "text-emerald-400" : debtFreeScore >= 40 ? "text-amber-400" : "text-rose-400"}`} />
          </div>
        </div>
        <div className="h-3 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${debtFreeScore >= 70 ? "gradient-primary" : debtFreeScore >= 40 ? "bg-gradient-to-r from-amber-500 to-yellow-400" : "bg-gradient-to-r from-rose-600 to-rose-400"}`}
            style={{ width: `${debtFreeScore}%`, boxShadow: debtFreeScore >= 70 ? "var(--shadow-glow)" : undefined }}
          />
        </div>
        <p className="text-xs text-white/30 mt-2">
          {debtFreeScore >= 80 ? "Excellent — minimal debt exposure." : debtFreeScore >= 50 ? "Good progress — keep paying down high-interest debt first." : "Focus on eliminating high-interest debt to improve your score."}
        </p>
      </div>

      {/* Strategy toggle */}
      {debts.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs text-white/40 uppercase tracking-wider">Payoff Strategy:</span>
          <div className="flex rounded-2xl overflow-hidden border border-emerald-500/15 bg-white/3">
            {(["avalanche", "snowball"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStrategy(s)}
                className={`px-4 py-2 text-xs font-semibold capitalize transition ${strategy === s ? "gradient-primary text-black" : "text-white/50 hover:text-white"}`}
              >
                {s === "avalanche" ? "⚡ Avalanche (Highest Rate First)" : "❄️ Snowball (Lowest Balance First)"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="glass rounded-3xl p-5 shadow-elegant mb-5 border border-emerald-500/15">
          <AddDebtForm
            onSuccess={() => {
              qc.invalidateQueries({ queryKey: ["wealth-shield-debts"] });
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Debt list */}
      {isLoading ? (
        <div className="glass rounded-3xl p-12 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-emerald-400" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center">
          <CheckCircle2 className="size-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-white/60 text-sm mb-1">No debts tracked yet.</p>
          <p className="text-white/30 text-xs">Add your first debt to start your payoff plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((debt, idx) => {
            const TypeDef = DEBT_TYPES.find((t) => t.value === debt.type) ?? DEBT_TYPES[DEBT_TYPES.length - 1];
            const Icon = TypeDef.icon;
            const isPriority = idx === 0;
            return (
              <div
                key={debt.id}
                className={`glass rounded-3xl p-5 shadow-elegant relative overflow-hidden transition hover:border-emerald-500/25 ${isPriority ? "border-emerald-500/20" : ""}`}
              >
                {isPriority && (
                  <div className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/20">
                    Attack First
                  </div>
                )}
                <div
                  className="absolute inset-0 opacity-20 pointer-events-none"
                  style={{ background: `radial-gradient(60% 60% at 0% 50%, ${isPriority ? "oklch(0.62 0.20 155 / 0.3)" : "oklch(0.65 0.22 25 / 0.2)"}, transparent 70%)` }}
                />
                <div className="relative flex items-start gap-4">
                  <div className={`size-11 rounded-2xl grid place-items-center shrink-0 ${isPriority ? "bg-emerald-500/15" : "bg-white/5"}`}>
                    <Icon className={`size-5 ${isPriority ? "text-emerald-400" : "text-white/50"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-white">{debt.name}</span>
                      <span className="text-xs text-white/40 capitalize">{TypeDef.label}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/30">Balance</div>
                        <div className="font-semibold text-rose-400">{fmtMoney(debt.balance)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/30">Interest</div>
                        <div className="font-semibold text-amber-400">{debt.interest_rate}%</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-white/30">Min. Payment</div>
                        <div className="font-semibold text-white/70">{fmtMoney(debt.min_payment)}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(debt.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-500/15 text-white/20 hover:text-rose-400 transition shrink-0"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function KpiTile({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: "emerald" | "amber" | "rose" }) {
  const colors = {
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber: "bg-amber-500/15 text-amber-400",
    rose: "bg-rose-500/15 text-rose-400",
  };
  return (
    <div className="glass rounded-3xl p-4 shadow-elegant">
      <div className="flex items-center gap-2 mb-2">
        <div className={`size-8 rounded-xl grid place-items-center ${colors[accent]}`}>
          <Icon className="size-4" />
        </div>
        <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function AddDebtForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("credit_card");
  const [balance, setBalance] = useState("");
  const [rate, setRate] = useState("");
  const [minPay, setMinPay] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Give the debt a name"); return; }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("debts").insert({
        user_id: user.id,
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        interest_rate: parseFloat(rate) || 0,
        min_payment: parseFloat(minPay) || 0,
      });
      if (error) throw error;
      toast.success("Debt added");
      onSuccess();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to add debt");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h3 className="font-semibold text-white mb-4">Add New Debt</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-white/40">Debt Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Nedbank Credit Card"
            className="w-full h-11 px-4 rounded-2xl bg-white/5 border border-emerald-500/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-white/40">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full h-11 px-4 rounded-2xl bg-white/5 border border-emerald-500/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
          >
            {DEBT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-white/40">Outstanding Balance (R)</label>
          <input
            type="number"
            inputMode="decimal"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="0.00"
            className="w-full h-11 px-4 rounded-2xl bg-white/5 border border-emerald-500/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-white/40">Interest Rate (%)</label>
          <input
            type="number"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="e.g. 21.5"
            className="w-full h-11 px-4 rounded-2xl bg-white/5 border border-emerald-500/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-white/40">Min. Monthly Payment (R)</label>
          <input
            type="number"
            inputMode="decimal"
            value={minPay}
            onChange={(e) => setMinPay(e.target.value)}
            placeholder="0.00"
            className="w-full h-11 px-4 rounded-2xl bg-white/5 border border-emerald-500/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 h-11 rounded-2xl gradient-primary text-black font-bold shadow-glow disabled:opacity-60 transition"
        >
          {busy ? "Saving…" : "Add Debt"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="h-11 px-5 rounded-2xl bg-white/5 text-white/60 hover:text-white text-sm border border-white/8 transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
