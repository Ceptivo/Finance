import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Wallet, ArrowUp, ArrowDown, TrendingUp, Trash2, Pencil, Loader2,
} from "lucide-react";
import { fmtMoney } from "@/lib/format";
import { useAccounts, useExpenses, useIncomes } from "@/lib/store";
import { toast } from "sonner";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

export const Route = createFileRoute("/accounts/$id")({ component: AccountDetailPage });

function AccountDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { items: accounts, isLoading, update, remove } = useAccounts();
  const { items: incomes } = useIncomes();
  const { items: expenses } = useExpenses();
  const [editing, setEditing] = useState(false);

  const account = accounts.find((a) => a.id === id);

  const accIncomes = useMemo(() => incomes.filter((i) => i.accountId === id), [incomes, id]);
  const accExpenses = useMemo(() => expenses.filter((e) => e.accountId === id), [expenses, id]);

  const totalIn = accIncomes.reduce((s, x) => s + x.amount, 0);
  const totalOut = accExpenses.reduce((s, x) => s + x.cost, 0);

  const series = useMemo(() => {
    const now = new Date();
    const out: Array<{ month: string; income: number; expenses: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      out.push({
        month: d.toLocaleString("en", { month: "short" }),
        income: accIncomes.filter((x) => x.date.startsWith(ym)).reduce((s, x) => s + x.amount, 0),
        expenses: accExpenses.filter((x) => x.date.startsWith(ym)).reduce((s, x) => s + x.cost, 0),
      });
    }
    return out;
  }, [accIncomes, accExpenses]);

  if (isLoading) {
    return <div className="glass rounded-2xl p-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }
  if (!account) {
    return (
      <div className="glass rounded-2xl p-12 text-center">
        <p className="text-sm text-muted-foreground mb-3">Account not found.</p>
        <Link to="/accounts" className="text-primary text-sm underline">Back to accounts</Link>
      </div>
    );
  }

  const recent = [
    ...accIncomes.map((i) => ({ kind: "in" as const, ...i })),
    ...accExpenses.map((e) => ({ kind: "out" as const, ...e })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <>
      <Link to="/accounts" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="size-3.5" /> All accounts
      </Link>

      <PageHeader
        title={account.name}
        subtitle={`${account.type[0].toUpperCase() + account.type.slice(1)} · ${account.currency}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil className="size-4 mr-1" /> Edit
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (confirm(`Delete account "${account.name}"?`)) {
                  remove(account.id).then(() => { toast.success("Account deleted"); navigate({ to: "/accounts" }); });
                }
              }}
            >
              <Trash2 className="size-4 mr-1 text-destructive" /> Delete
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Balance" value={fmtMoney(account.balance)} icon={Wallet} />
        <KpiCard label="Total In" value={fmtMoney(totalIn)} icon={ArrowUp} />
        <KpiCard label="Total Out" value={fmtMoney(totalOut)} icon={ArrowDown} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 glass rounded-2xl p-5 shadow-elegant">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-semibold">Activity</h3>
              <p className="text-xs text-muted-foreground">Last 6 months</p>
            </div>
            <TrendingUp className="size-4 text-primary" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series}>
                <defs>
                  <linearGradient id="acc-in" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="acc-out" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-chart-4)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--color-chart-4)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 12 }} formatter={(v: number) => fmtMoney(Number(v))} />
                <Area type="monotone" dataKey="income" stroke="var(--color-chart-3)" strokeWidth={2.5} fill="url(#acc-in)" />
                <Area type="monotone" dataKey="expenses" stroke="var(--color-chart-4)" strokeWidth={2.5} fill="url(#acc-out)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-2xl p-5 shadow-elegant">
          <h3 className="font-semibold mb-3">Recent transactions</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions linked yet. Add income or expenses to this account.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((r) => (
                <li key={`${r.kind}-${r.id}`} className="flex items-center justify-between text-sm py-1.5 border-b border-border/60 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`size-7 grid place-items-center rounded-full ${r.kind === "in" ? "bg-emerald-500/15 text-emerald-400" : "bg-rose-500/15 text-rose-400"}`}>
                      {r.kind === "in" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.kind === "in" ? r.source : r.description}</div>
                      <div className="text-[11px] text-muted-foreground">{r.category} · {r.date}</div>
                    </div>
                  </div>
                  <div className={`font-semibold ${r.kind === "in" ? "text-emerald-400" : "text-rose-400"}`}>
                    {r.kind === "in" ? "+" : "−"}{fmtMoney(r.kind === "in" ? r.amount : r.cost)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <EditDialog open={editing} onOpenChange={setEditing} accountId={account.id}
        initialName={account.name} initialBalance={account.balance}
        onSave={async (patch) => { await update(account.id, patch); toast.success("Account updated"); }}
      />
    </>
  );
}

function EditDialog({
  open, onOpenChange, initialName, initialBalance, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accountId: string;
  initialName: string;
  initialBalance: number;
  onSave: (patch: { name: string; balance: number }) => Promise<void>;
}) {
  const [name, setName] = useState(initialName);
  const [balance, setBalance] = useState(String(initialBalance));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10">
        <DialogHeader>
          <DialogTitle>Edit account</DialogTitle>
          <DialogDescription>Update name or balance.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Balance</Label>
            <Input inputMode="decimal" value={balance} onChange={(e) => setBalance(e.target.value)} />
          </div>
          <Button
            onClick={async () => {
              const b = parseFloat(balance);
              await onSave({ name: name.trim(), balance: Number.isFinite(b) ? b : 0 });
              onOpenChange(false);
            }}
            className="w-full gradient-primary text-primary-foreground border-0 shadow-glow"
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
