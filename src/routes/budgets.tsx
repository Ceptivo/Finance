import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { KpiCard } from "@/components/KpiCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listBudgets, upsertBudget, deleteBudget } from "@/lib/budgets.functions";
import { EXPENSE_CATEGORIES } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { PiggyBank, Plus, Trash2, AlertTriangle, CheckCircle2, Flame } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/budgets")({ component: BudgetsPage });

function BudgetsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listBudgets);
  const upsertFn = useServerFn(upsertBudget);
  const deleteFn = useServerFn(deleteBudget);

  const q = useQuery({ queryKey: ["budgets"], queryFn: () => listFn(), staleTime: 30_000 });
  const items = q.data?.items ?? [];
  const available = q.data?.available ?? true;

  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [limit, setLimit] = useState("");

  const save = useMutation({
    mutationFn: () => upsertFn({ data: { category, monthly_limit: parseFloat(limit) } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success(`Budget set for ${category}`);
      setOpen(false);
      setLimit("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totalLimit = items.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = items.reduce((s, b) => s + b.spent, 0);
  const overCount = items.filter((b) => b.pct >= 100).length;

  return (
    <>
      <PageHeader
        title="Budgets"
        subtitle="Set a monthly limit per category and watch your spending against it."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-primary-foreground shadow-glow border-0">
                <Plus className="size-4 mr-1" /> Set Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-white/10">
              <DialogHeader>
                <DialogTitle>Set a category budget</DialogTitle>
                <DialogDescription>
                  Updates the limit if the category already has one.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  inputMode="decimal"
                  placeholder="Monthly limit, e.g. 500"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                />
                <Button
                  onClick={() => {
                    const n = parseFloat(limit);
                    if (!Number.isFinite(n) || n <= 0) {
                      toast.error("Enter a limit above zero");
                      return;
                    }
                    save.mutate();
                  }}
                  disabled={save.isPending}
                  className="w-full gradient-primary text-primary-foreground border-0 shadow-glow"
                >
                  Save budget
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {!available && (
        <div className="glass rounded-2xl p-5 mb-5 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-semibold mb-1">One-time database setup needed</div>
            <p className="text-muted-foreground">
              Open your Supabase dashboard → SQL editor and run the migration file{" "}
              <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">
                supabase/migrations/20260611140000_budgets_networth_indexes.sql
              </code>{" "}
              from this repo. It creates the budgets and net-worth tables.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard label="Total Budgeted" value={fmtMoney(totalLimit)} icon={PiggyBank} />
        <KpiCard label="Spent This Month" value={fmtMoney(totalSpent)} icon={Flame} />
        <KpiCard
          label="Over Budget"
          value={String(overCount)}
          icon={AlertTriangle}
          sub={overCount ? [{ label: "Categories", value: "need attention" }] : undefined}
        />
      </div>

      {items.length === 0 && available ? (
        <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No budgets yet. Click <span className="text-foreground font-medium">Set Budget</span> to
          add your first category limit.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((b) => {
            const over = b.pct >= 100;
            const warn = b.pct >= 80 && !over;
            return (
              <div key={b.id} className="glass rounded-2xl p-5 shadow-elegant">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{b.category}</span>
                    {over ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-medium">
                        Over budget
                      </span>
                    ) : warn ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-medium">
                        {b.pct}% used
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> on track
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => del.mutate(b.id)}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${b.category} budget`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <Progress
                  value={Math.min(100, b.pct)}
                  className={over ? "[&>div]:bg-rose-500" : warn ? "[&>div]:bg-amber-500" : ""}
                />
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {fmtMoney(b.spent)} of {fmtMoney(b.monthly_limit)}
                  </span>
                  <span className={over ? "text-rose-400 font-medium" : "text-muted-foreground"}>
                    {over
                      ? `${fmtMoney(Math.abs(b.remaining))} over`
                      : `${fmtMoney(b.remaining)} left`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
