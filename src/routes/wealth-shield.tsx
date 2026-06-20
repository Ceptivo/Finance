import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { fmtMoney } from "@/lib/format";
import { listDebts, saveDebt, calculatePayoffPlan } from "@/lib/debts.functions";
import { getTFSASummary, updateTFSAContribution } from "@/lib/tfsa.functions";
import { listUpcomingBills, addRecurringBill } from "@/lib/bills.functions";
import { detectBankFees } from "@/lib/fee-sniper.functions";
import {
  ShieldCheck,
  TrendingDown,
  Landmark,
  CalendarClock,
  Crosshair,
  Plus,
  Loader2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wealth-shield")({ component: WealthShieldPage });

function WealthShieldPage() {
  return (
    <>
      <PageHeader
        title="Wealth Shield"
        subtitle="Kill debt faster, protect your TFSA, never miss a debit, and stop fee leaks."
      />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <DebtPayoffEngine />
        <div className="space-y-5">
          <TfsaGuard />
          <FeeSniper />
        </div>
        <BillsCalendar />
      </div>
    </>
  );
}

/* ============ 1. DEBT PAYOFF ENGINE — Snowball vs Avalanche ============ */
function DebtPayoffEngine() {
  const qc = useQueryClient();
  const listFn = useServerFn(listDebts);
  const saveFn = useServerFn(saveDebt);
  const planFn = useServerFn(calculatePayoffPlan);

  const debtsQ = useQuery({ queryKey: ["debts"], queryFn: () => listFn(), staleTime: 60_000 });
  const debts = (debtsQ.data?.debts ?? []) as any[];

  const [extra, setExtra] = useState("1000");
  const extraNum = Math.max(0, parseFloat(extra) || 0);

  const snowballQ = useQuery({
    queryKey: ["payoff", "snowball", extraNum, debts.length],
    queryFn: () => planFn({ data: { strategy: "snowball", extraPayment: extraNum } }),
    enabled: debts.length > 0,
    staleTime: 5 * 60_000,
  });
  const avalancheQ = useQuery({
    queryKey: ["payoff", "avalanche", extraNum, debts.length],
    queryFn: () => planFn({ data: { strategy: "avalanche", extraPayment: extraNum } }),
    enabled: debts.length > 0,
    staleTime: 5 * 60_000,
  });

  const snow = snowballQ.data?.schedule ?? [];
  const aval = avalancheQ.data?.schedule ?? [];
  const months = Math.max(snow.length, aval.length);
  const chart = Array.from({ length: months }, (_, i) => ({
    month: i + 1,
    Snowball: snow[i] ? Math.round(snow[i].remaining) : 0,
    Avalanche: aval[i] ? Math.round(aval[i].remaining) : 0,
  }));
  const snowInterest = snow.reduce((s: number, m: any) => s + (m.interestPaid || 0), 0);
  const avalInterest = aval.reduce((s: number, m: any) => s + (m.interestPaid || 0), 0);
  const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);

  // Add-debt form (columns match the debts table exactly)
  const [form, setForm] = useState({
    name: "",
    balance: "",
    interest_rate: "",
    minimum_payment: "",
  });
  const add = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          name: form.name.trim(),
          balance: parseFloat(form.balance) || 0,
          interest_rate: parseFloat(form.interest_rate) || 0,
          minimum_payment: parseFloat(form.minimum_payment) || 0,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts"] });
      qc.invalidateQueries({ queryKey: ["payoff"] });
      setForm({ name: "", balance: "", interest_rate: "", minimum_payment: "" });
      toast.success("Debt added to the engine");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="glass rounded-2xl p-5 shadow-elegant border border-emerald-500/15 xl:col-span-2">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/15 grid place-items-center">
            <TrendingDown className="size-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold">Debt Payoff Engine</h3>
            <p className="text-xs text-muted-foreground">
              Snowball (smallest first, quick wins) vs Avalanche (highest interest first, cheapest)
            </p>
          </div>
        </div>
        {debts.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Total debt</div>
            <div className="text-xl font-bold tabular-nums text-rose-400">
              {fmtMoney(totalDebt)}
            </div>
          </div>
        )}
      </div>

      {/* Add debt */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <Input
          placeholder="Debt name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="md:col-span-2"
        />
        <Input
          inputMode="decimal"
          placeholder="Balance (R)"
          value={form.balance}
          onChange={(e) => setForm({ ...form, balance: e.target.value })}
        />
        <Input
          inputMode="decimal"
          placeholder="Rate %/yr"
          value={form.interest_rate}
          onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
        />
        <div className="flex gap-2">
          <Input
            inputMode="decimal"
            placeholder="Min/mo (R)"
            value={form.minimum_payment}
            onChange={(e) => setForm({ ...form, minimum_payment: e.target.value })}
          />
          <Button
            onClick={() => {
              if (!form.name.trim() || !(parseFloat(form.balance) > 0)) {
                toast.error("Name and balance required");
                return;
              }
              add.mutate();
            }}
            disabled={add.isPending}
            className="shrink-0 gradient-primary text-primary-foreground border-0 shadow-glow"
            aria-label="Add debt"
          >
            {add.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {debts.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Add your debts above (credit card, car, loans) and watch both paths to{" "}
          <span className="text-emerald-400 font-semibold">R0</span>.
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <label className="text-xs text-muted-foreground">Extra payment / month</label>
            <Input
              inputMode="decimal"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              className="w-28 h-8 text-sm"
            />
            <div className="flex gap-4 ml-auto text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-sky-400" /> Snowball: {snow.length} mo ·{" "}
                {fmtMoney(snowInterest)} interest
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-emerald-400" /> Avalanche: {aval.length}{" "}
                mo · {fmtMoney(avalInterest)} interest
              </span>
            </div>
          </div>
          <div className="h-72">
            {snowballQ.isLoading || avalancheQ.isLoading ? (
              <div className="h-full grid place-items-center">
                <Loader2 className="size-5 animate-spin text-primary" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "months",
                      position: "insideBottomRight",
                      fontSize: 10,
                      fill: "var(--color-muted-foreground)",
                    }}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={75}
                    tickFormatter={(v: number) => fmtMoney(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                    }}
                    formatter={(v: number) => fmtMoney(Number(v))}
                    labelFormatter={(m) => `Month ${m}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Snowball"
                    stroke="#38bdf8"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Avalanche"
                    stroke="#34d399"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {avalInterest < snowInterest && (
            <p className="mt-2 text-xs text-muted-foreground">
              <Sparkles className="size-3 inline mr-1 text-emerald-400" />
              Avalanche saves you{" "}
              <span className="text-emerald-400 font-semibold">
                {fmtMoney(snowInterest - avalInterest)}
              </span>{" "}
              in interest — Snowball gives faster small wins for motivation.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ============ 2. TFSA LIMIT GUARD — R36,000 / SARS ============ */
function TfsaGuard() {
  const qc = useQueryClient();
  const sumFn = useServerFn(getTFSASummary);
  const updFn = useServerFn(updateTFSAContribution);
  const q = useQuery({ queryKey: ["tfsa"], queryFn: () => sumFn(), staleTime: 60_000 });
  const t = q.data;
  const [amount, setAmount] = useState("");

  const save = useMutation({
    mutationFn: () => updFn({ data: { amount: parseFloat(amount) || 0 } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tfsa"] });
      setAmount("");
      toast.success("TFSA contribution updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pct = Math.min(100, t?.percentUsed ?? 0);
  const danger = (t?.percentUsed ?? 0) >= 90;
  const over = t?.isOverLimit ?? false;
  const R = 52;
  const C = 2 * Math.PI * R;

  return (
    <section className="glass rounded-2xl p-5 shadow-elegant border border-emerald-500/15">
      <div className="flex items-center gap-3 mb-4">
        <div className="size-10 rounded-xl bg-emerald-500/15 grid place-items-center">
          <Landmark className="size-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="font-semibold">TFSA Limit Guard</h3>
          <p className="text-xs text-muted-foreground">
            R36,000 annual limit · SARS-safe investing
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div
          className="relative size-32 shrink-0"
          title={
            danger
              ? "SARS penalty warning: contributions above R36,000 are taxed at 40% of the excess."
              : undefined
          }
        >
          <svg viewBox="0 0 120 120" className="size-32 -rotate-90">
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke="var(--color-muted)"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={over ? "#fb7185" : danger ? "#fbbf24" : "#34d399"}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C - (C * pct) / 100}
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className={`text-xl font-bold tabular-nums ${over ? "text-rose-400" : ""}`}>
                {Math.round(t?.percentUsed ?? 0)}%
              </div>
              <div className="text-[10px] text-muted-foreground">used</div>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-sm">
            <span className="font-semibold tabular-nums">{fmtMoney(t?.used ?? 0)}</span>
            <span className="text-muted-foreground"> of {fmtMoney(t?.limit ?? 36000)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {fmtMoney(t?.remaining ?? 36000)} of tax-free room left this year
          </div>
          {(danger || over) && (
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/40 px-3 py-2 text-xs flex items-start gap-1.5">
              <AlertTriangle className="size-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span>
                <span className="font-semibold text-rose-300">SARS penalty warning: </span>
                {over
                  ? `you are over the limit — 40% tax on the excess ≈ ${fmtMoney(t?.penaltyRisk ?? 0)}.`
                  : "contributions above R36,000 are taxed at 40% of the excess."}
              </span>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Input
              inputMode="decimal"
              placeholder="Contributed this tax year (R)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-9 text-sm"
            />
            <Button
              size="sm"
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="gradient-primary text-primary-foreground border-0 shadow-glow h-9"
            >
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Update"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ 3. RECURRING BILLS — Up Next (7 days) ============ */
function BillsCalendar() {
  const qc = useQueryClient();
  const listFn = useServerFn(listUpcomingBills);
  const addFn = useServerFn(addRecurringBill);
  const q = useQuery({ queryKey: ["bills"], queryFn: () => listFn(), staleTime: 60_000 });
  const upcoming = (q.data?.upcoming ?? []) as any[];
  const all = (q.data?.bills ?? []) as any[];

  const [form, setForm] = useState({ name: "", amount: "", due_day: "" });
  const add = useMutation({
    mutationFn: () =>
      addFn({
        data: {
          name: form.name.trim(),
          amount: parseFloat(form.amount) || 0,
          due_day: parseInt(form.due_day) || 1,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      setForm({ name: "", amount: "", due_day: "" });
      toast.success("Recurring bill added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="glass rounded-2xl p-5 shadow-elegant border border-emerald-500/15 xl:col-span-2">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/15 grid place-items-center">
            <CalendarClock className="size-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold">Up Next · Recurring Bills</h3>
            <p className="text-xs text-muted-foreground">
              Debits leaving your account in the next 7 days
            </p>
          </div>
        </div>
        {upcoming.length > 0 && (
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Leaving in 7 days</div>
            <div className="text-xl font-bold tabular-nums">
              {fmtMoney(q.data?.totalUpcomingZAR ?? 0)}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
        <Input
          placeholder="Bill name (e.g. Rent)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="md:col-span-2"
        />
        <Input
          inputMode="decimal"
          placeholder="Amount (R)"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />
        <div className="flex gap-2">
          <Input
            inputMode="numeric"
            placeholder="Day (1-31)"
            value={form.due_day}
            onChange={(e) => setForm({ ...form, due_day: e.target.value })}
          />
          <Button
            onClick={() => {
              const day = parseInt(form.due_day);
              if (!form.name.trim() || !(parseFloat(form.amount) > 0) || !(day >= 1 && day <= 31)) {
                toast.error("Name, amount, and a day between 1–31 required");
                return;
              }
              add.mutate();
            }}
            disabled={add.isPending}
            className="shrink-0 gradient-primary text-primary-foreground border-0 shadow-glow"
            aria-label="Add bill"
          >
            {add.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </div>
      </div>

      {all.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          No recurring bills yet — add rent, insurance, school fees…
        </p>
      ) : upcoming.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nothing due in the next 7 days. {all.length} bill{all.length === 1 ? "" : "s"} tracked. 😌
        </p>
      ) : (
        <ol className="relative border-l border-emerald-500/30 ml-2 space-y-4">
          {upcoming.map((b: any) => (
            <li key={b.id} className="ml-5">
              <span className="absolute -left-[7px] size-3.5 rounded-full bg-emerald-400 shadow-glow mt-1" />
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(b.next_due + "T00:00:00").toLocaleDateString("en-ZA", {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                    {b.category ? ` · ${b.category}` : ""}
                  </div>
                </div>
                <div className="font-semibold tabular-nums text-rose-400 shrink-0">
                  −{fmtMoney(Number(b.amount))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/* ============ 4. BANK FEE SNIPER — Leaks Detected ============ */
function FeeSniper() {
  const fn = useServerFn(detectBankFees);
  const q = useQuery({ queryKey: ["fee-sniper"], queryFn: () => fn(), staleTime: 10 * 60_000 });
  const total = q.data?.totalFeesZAR ?? 0;
  const txs = (q.data?.feeTransactions ?? []) as any[];

  return (
    <section className="glass rounded-2xl p-5 shadow-elegant border border-rose-500/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-xl bg-rose-500/15 grid place-items-center">
          <Crosshair className="size-5 text-rose-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">Bank Fee Sniper</h3>
          <p className="text-xs text-muted-foreground">Fee-like charges in the last 30 days</p>
        </div>
        {q.isLoading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`text-3xl font-bold tabular-nums ${total > 0 ? "text-rose-400" : "text-emerald-400"}`}
        >
          {fmtMoney(total)}
        </span>
        <span className="text-xs text-muted-foreground">
          {total > 0
            ? `leaked across ${txs.length} charge${txs.length === 1 ? "" : "s"}`
            : "no leaks detected 🎯"}
        </span>
      </div>

      {txs.length > 0 && (
        <ul className="mt-3 space-y-1.5 max-h-36 overflow-y-auto pr-1">
          {txs.slice(0, 8).map((t: any) => (
            <li key={t.id} className="flex justify-between text-xs">
              <span className="text-muted-foreground truncate">
                {t.merchant} · {t.occurred_on}
              </span>
              <span className="tabular-nums shrink-0">−{fmtMoney(Number(t.amount))}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-xl bg-muted/40 border border-border px-3 py-2.5 text-xs flex items-start gap-2">
        <ShieldCheck className="size-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Switch & Save: </span>
          <span className="text-muted-foreground">
            {q.data?.insight ?? "Sync or add expenses to start sniping fees."}
          </span>
          {total > 0 && (
            <span className="text-emerald-400 font-medium">
              {" "}
              Cutting these saves ≈ {fmtMoney(total * 12)}/year.
            </span>
          )}
        </div>
        <ArrowRight className="size-3.5 text-muted-foreground shrink-0 mt-0.5 ml-auto" />
      </div>
    </section>
  );
}
