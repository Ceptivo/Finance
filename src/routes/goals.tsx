import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Target, PiggyBank, Loader2, Save } from "lucide-react";
import { getProfile, saveProfile } from "@/lib/investment.functions";
import { useIncomes, useExpenses, inMonth } from "@/lib/store";
import { fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/goals")({ component: GoalsPage });

function GoalsPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveProfile);
  const { data, isLoading } = useQuery({ queryKey: ["fin-profile"], queryFn: () => getFn() });
  const profile: any = data?.profile ?? {};

  const [savingsGoal, setSavingsGoal] = useState("");
  const [incomeGoal, setIncomeGoal] = useState("");

  useEffect(() => {
    setSavingsGoal(profile?.monthly_savings_goal != null ? String(profile.monthly_savings_goal) : "");
    setIncomeGoal(profile?.monthly_income != null ? String(profile.monthly_income) : "");
  }, [profile?.monthly_savings_goal, profile?.monthly_income]);

  const { items: incomes } = useIncomes();
  const { items: expenses } = useExpenses();
  const incomeMo = incomes.filter((i) => inMonth(i.date)).reduce((s, i) => s + i.amount, 0);
  const expenseMo = expenses.filter((e) => inMonth(e.date)).reduce((s, e) => s + e.cost, 0);
  const savedMo = Math.max(0, incomeMo - expenseMo);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          ...(profile ?? {}),
          monthly_savings_goal: parseFloat(savingsGoal) || 0,
          monthly_income: parseFloat(incomeGoal) || profile?.monthly_income || 0,
        } as any,
      }),
    onSuccess: () => {
      toast.success("Goals saved");
      qc.invalidateQueries({ queryKey: ["fin-profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const goal = parseFloat(savingsGoal) || 0;
  const pct = goal > 0 ? Math.min(100, Math.round((savedMo / goal) * 100)) : 0;

  if (isLoading) {
    return <div className="glass rounded-2xl p-12 grid place-items-center"><Loader2 className="size-6 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <PageHeader title="Goals" subtitle="Set monthly targets for what you want to save and earn." />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-6 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow">
              <PiggyBank className="size-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Monthly Savings Goal</h3>
              <p className="text-xs text-muted-foreground">Saved this month: {fmtMoney(savedMo)}</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target</Label>
              <Input inputMode="decimal" value={savingsGoal} onChange={(e) => setSavingsGoal(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full gradient-primary shadow-glow transition-all" style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{pct}% reached</span>
                <span>{goal > 0 ? fmtMoney(Math.max(0, goal - savedMo)) : "—"} to go</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-accent grid place-items-center">
              <Target className="size-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Monthly Income Target</h3>
              <p className="text-xs text-muted-foreground">Earned this month: {fmtMoney(incomeMo)}</p>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Target</Label>
            <Input inputMode="decimal" value={incomeGoal} onChange={(e) => setIncomeGoal(e.target.value)} placeholder="0.00" />
          </div>
        </div>
      </div>

      <Button
        onClick={() => save.mutate()}
        disabled={save.isPending}
        className="mt-6 gradient-primary text-primary-foreground border-0 shadow-glow"
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Save className="size-4 mr-2" /> Save Goals</>}
      </Button>
    </>
  );
}
