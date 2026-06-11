import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wallet, PiggyBank, Banknote, CreditCard, Plus, Trash2, ArrowUp, ArrowDown,
  TrendingUp, Building2, ChevronRight, Loader2,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useAccounts, useExpenses, useIncomes, inMonth } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/accounts")({ component: AccountsPage });

const ICONS: Record<string, typeof Wallet> = {
  Wallet, PiggyBank, Banknote, CreditCard, Building2,
};

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank / Current", icon: "Wallet" },
  { value: "savings", label: "Savings", icon: "PiggyBank" },
  { value: "cash", label: "Cash", icon: "Banknote" },
  { value: "credit", label: "Credit Card", icon: "CreditCard" },
  { value: "investment", label: "Investment", icon: "TrendingUp" },
  { value: "other", label: "Other", icon: "Building2" },
];

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#A78BFA", "#EC4899", "#14B8A6", "#F97316"];

function AccountsPage() {
  const { items, isLoading, remove } = useAccounts();
  const { items: incomes } = useIncomes();
  const { items: expenses } = useExpenses();
  const [open, setOpen] = useState(false);

  const netWorth = items.reduce((s, a) => s + (a.isLiability ? -a.balance : a.balance), 0);
  const assets = items.filter((a) => !a.isLiability).reduce((s, a) => s + a.balance, 0);
  const liabilities = items.filter((a) => a.isLiability).reduce((s, a) => s + a.balance, 0);

  return (
    <>
      <PageHeader
        title="Accounts"
        subtitle="All your balances in one place — bank, savings, cash, cards."
        actions={
          <Button onClick={() => setOpen(true)} className="gradient-primary text-primary-foreground shadow-glow border-0">
            <Plus className="size-4 mr-1" /> New Account
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Net Worth" value={fmtMoney(netWorth)} icon={TrendingUp} />
        <KpiCard label="Total Assets" value={fmtMoney(assets)} icon={Wallet} />
        <KpiCard label="Total Liabilities" value={fmtMoney(liabilities)} icon={CreditCard} />
      </div>

      {isLoading ? (
        <div className="glass rounded-2xl p-12 grid place-items-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground mb-3">No accounts yet.</p>
          <Button onClick={() => setOpen(true)} className="gradient-primary text-primary-foreground border-0">
            <Plus className="size-4 mr-1" /> Create your first account
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((a) => {
            const Icon = ICONS[a.icon ?? "Wallet"] ?? Wallet;
            const inflow = incomes.filter((i) => i.accountId === a.id && inMonth(i.date)).reduce((s, x) => s + x.amount, 0);
            const outflow = expenses.filter((e) => e.accountId === a.id && inMonth(e.date)).reduce((s, x) => s + x.cost, 0);
            return (
              <Link
                key={a.id}
                to="/accounts/$id"
                params={{ id: a.id }}
                className="group glass rounded-2xl p-5 shadow-elegant relative overflow-hidden hover:shadow-glow transition-smooth"
              >
                <div
                  className="absolute inset-0 opacity-25 pointer-events-none"
                  style={{ background: `radial-gradient(80% 60% at 0% 0%, ${a.color ?? "#3B82F6"}, transparent 60%)` }}
                />
                <div className="relative">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-xl grid place-items-center" style={{ background: `${a.color ?? "#3B82F6"}22`, color: a.color ?? "#3B82F6" }}>
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                          {a.type} {a.isLiability ? "· Liability" : ""}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm(`Delete account "${a.name}"? Transactions will be unlinked.`)) {
                          remove(a.id).then(() => toast.success("Account deleted"));
                        }
                      }}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-semibold tracking-tight">{fmtMoney(a.balance)}</div>
                    <div className="text-xs text-muted-foreground">{a.currency} balance</div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <ArrowUp className="size-3" /> {fmtMoney(inflow)}
                    </div>
                    <div className="flex items-center gap-1.5 text-rose-400">
                      <ArrowDown className="size-3" /> {fmtMoney(outflow)}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground group-hover:text-primary transition">
                    View account <ChevronRight className="size-3.5" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <AddAccountDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function AddAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { add } = useAccounts();
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [balance, setBalance] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [color, setColor] = useState(COLORS[0]);
  const [isLiability, setIsLiability] = useState(false);

  const reset = () => { setName(""); setType("bank"); setBalance(""); setCurrency("USD"); setColor(COLORS[0]); setIsLiability(false); };

  const submit = async () => {
    if (!name.trim()) { toast.error("Give the account a name"); return; }
    const b = parseFloat(balance);
    const def = ACCOUNT_TYPES.find((t) => t.value === type);
    try {
      await add({
        name: name.trim(),
        type,
        balance: Number.isFinite(b) ? b : 0,
        currency,
        color,
        icon: def?.icon ?? "Wallet",
        isLiability: type === "credit" ? true : isLiability,
      });
      toast.success("Account created");
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="glass-strong border-white/10">
        <DialogHeader>
          <DialogTitle>New account</DialogTitle>
          <DialogDescription>Track another bank, wallet, or card.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Capitec Current" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD","ZAR","EUR","GBP","AUD","CAD"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Starting balance</Label>
            <Input inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="size-7 rounded-full border-2 transition"
                  style={{ background: c, borderColor: c === color ? "white" : "transparent" }}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>
          <Button onClick={submit} className="w-full gradient-primary text-primary-foreground border-0 shadow-glow">
            Create account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
