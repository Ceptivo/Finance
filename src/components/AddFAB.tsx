import { useEffect, useRef, useState } from "react";
import { Plus, X, ArrowUp, ArrowDown, Repeat, Camera, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  EXPENSE_CATEGORIES, INCOME_CATEGORIES, SUB_CATEGORIES,
  todayISO, useAccounts, useExpenses, useIncomes, useSubs, useCustomCategories, mergedCategoryNames,
  type ExpenseCategory, type IncomeCategory, type SubCategory,
} from "@/lib/store";
import { parseReceipt } from "@/lib/receipt.functions";
import { getCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const composeISO = (date: string, time: string | undefined | null) => {
  if (!time) return null;
  // local time → ISO
  const d = new Date(`${date}T${time}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

type Modal = null | "income" | "expense" | "subscription" | "receipt";

const ACTIONS: Array<{ key: Exclude<Modal, null>; label: string; icon: typeof Plus; tint: string }> = [
  { key: "income",       label: "Add Income",       icon: ArrowUp,    tint: "from-emerald-500/90 to-emerald-400/90" },
  { key: "expense",      label: "Add Expense",      icon: ArrowDown,  tint: "from-rose-500/90 to-rose-400/90" },
  { key: "subscription", label: "Add Subscription", icon: Repeat,     tint: "from-violet-500/90 to-violet-400/90" },
  { key: "receipt",      label: "Scan Receipt",     icon: Camera,     tint: "from-sky-500/90 to-sky-400/90" },
];

export function AddFAB({ defaultOpen }: { defaultOpen?: Modal } = {}) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<Modal>(defaultOpen ?? null);

  // Allow other components to trigger a modal via window event
  useEffect(() => {
    const h = (e: Event) => setModal(((e as CustomEvent).detail ?? null) as Modal);
    window.addEventListener("fh:add", h);
    return () => window.removeEventListener("fh:add", h);
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Floating action stack */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {ACTIONS.map((a, i) => {
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              onClick={() => { setModal(a.key); setOpen(false); }}
              className={cn(
                "group flex items-center gap-3 pl-4 pr-3 h-11 rounded-full",
                "glass-strong border border-white/10 shadow-elegant",
                "transition-all duration-300 origin-bottom-right",
                open
                  ? "opacity-100 translate-y-0 scale-100"
                  : "opacity-0 translate-y-2 scale-90 pointer-events-none"
              )}
              style={{ transitionDelay: open ? `${i * 35}ms` : "0ms" }}
            >
              <span className="text-sm font-medium pr-1">{a.label}</span>
              <span className={cn("size-8 rounded-full grid place-items-center bg-gradient-to-br shadow-glow", a.tint)}>
                <Icon className="size-4 text-white" />
              </span>
            </button>
          );
        })}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close add menu" : "Open add menu"}
          className={cn(
            "size-14 rounded-full grid place-items-center shadow-glow gradient-primary",
            "border border-white/15 transition-transform duration-300",
            open ? "rotate-45" : "rotate-0"
          )}
        >
          <Plus className="size-6 text-primary-foreground" />
        </button>
      </div>

      <AddIncomeDialog open={modal === "income"} onOpenChange={(v) => !v && setModal(null)} />
      <AddExpenseDialog open={modal === "expense"} onOpenChange={(v) => !v && setModal(null)} />
      <AddSubscriptionDialog open={modal === "subscription"} onOpenChange={(v) => !v && setModal(null)} />
      <ReceiptDialog open={modal === "receipt"} onOpenChange={(v) => !v && setModal(null)} />
    </>
  );
}

/* Programmatic trigger from any page */
export function openAddModal(kind: Exclude<Modal, null>) {
  window.dispatchEvent(new CustomEvent("fh:add", { detail: kind }));
}

/* ---------- Dialogs ---------- */

function AccountField({
  value, onChange,
}: { value: string | null; onChange: (v: string | null) => void }) {
  const { items } = useAccounts();
  if (items.length === 0) return null;
  return (
    <Field label="Account">
      <Select value={value ?? "__none"} onValueChange={(v) => onChange(v === "__none" ? null : v)}>
        <SelectTrigger><SelectValue placeholder="Pick account" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">— none —</SelectItem>
          {items.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}

function AddIncomeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { add } = useIncomes();
  const { items: accounts } = useAccounts();
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<IncomeCategory>("Salary");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowTime());
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setSource(""); setAmount(""); setCategory("Salary"); setDate(todayISO()); setTime(nowTime()); setNote("");
      setAccountId(accounts[0]?.id ?? null);
    }
  }, [open, accounts]);

  const submit = async () => {
    const a = parseFloat(amount);
    if (!source.trim() || !Number.isFinite(a) || a <= 0) { toast.error("Add a source and amount"); return; }
    setBusy(true);
    try {
      await add({ source: source.trim(), amount: a, category, date, time: composeISO(date, time), note: note.trim() || undefined, accountId });
      toast.success("Income added");
      onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add income</DialogTitle>
          <DialogDescription>Log money coming in.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Source"><Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Ceptivo client" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Amount"><Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <CategoryPicker kind="income" value={category} onChange={(v) => setCategory(v as IncomeCategory)} builtins={INCOME_CATEGORIES} onCreateNav={() => onOpenChange(false)} />
          <AccountField value={accountId} onChange={setAccountId} />
          <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Button onClick={submit} disabled={busy} className="w-full gradient-primary text-primary-foreground border-0 shadow-glow">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Save income"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddExpenseDialog({
  open, onOpenChange, prefill,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefill?: { description?: string; cost?: number; category?: ExpenseCategory; date?: string };
}) {
  const { add } = useExpenses();
  const { items: accounts } = useAccounts();
  const [description, setDescription] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Other");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowTime());
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDescription(prefill?.description ?? "");
    setCost(prefill?.cost ? String(prefill.cost) : "");
    setCategory(prefill?.category ?? "Other");
    setDate(prefill?.date ?? todayISO());
    setTime(nowTime());
    setNote("");
    setAccountId(accounts[0]?.id ?? null);
  }, [open, prefill, accounts]);

  const submit = async () => {
    const c = parseFloat(cost);
    if (!description.trim() || !Number.isFinite(c) || c <= 0) { toast.error("Add a description and amount"); return; }
    setBusy(true);
    try {
      await add({ description: description.trim(), cost: c, category, date, time: composeISO(date, time), note: note.trim() || undefined, accountId });
      toast.success("Expense added");
      onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>Log money going out.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Groceries at Pick n Pay" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cost"><Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
          <Field label="Time"><Input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <CategoryPicker kind="expense" value={category} onChange={(v) => setCategory(v as ExpenseCategory)} builtins={EXPENSE_CATEGORIES} onCreateNav={() => onOpenChange(false)} />
          <AccountField value={accountId} onChange={setAccountId} />
          <Field label="Note (optional)"><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Button onClick={submit} disabled={busy} className="w-full gradient-primary text-primary-foreground border-0 shadow-glow">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Save expense"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddSubscriptionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { add } = useSubs();
  const { items: accounts } = useAccounts();
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [category, setCategory] = useState<SubCategory>("AI");
  const [cycle, setCycle] = useState<"Monthly" | "Yearly">("Monthly");
  const [nextCharge, setNextCharge] = useState(todayISO());
  const [billingStart, setBillingStart] = useState(todayISO());
  const [billingEnd, setBillingEnd] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(""); setCost(""); setCategory("AI"); setCycle("Monthly");
      setNextCharge(todayISO()); setBillingStart(todayISO()); setBillingEnd("");
      setAccountId(accounts[0]?.id ?? null);
    }
  }, [open, accounts]);

  const submit = async () => {
    const c = parseFloat(cost);
    if (!name.trim() || !Number.isFinite(c) || c <= 0) { toast.error("Add a name and cost"); return; }
    const monthlyCost = cycle === "Yearly" ? c / 12 : c;
    setBusy(true);
    try {
      await add({
        name: name.trim(), monthlyCost, billingCycle: cycle, category, nextCharge,
        billingStart: billingStart || null, billingEnd: billingEnd || null,
        status: "Active", accountId,
      });
      toast.success("Subscription added");
      onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add subscription</DialogTitle>
          <DialogDescription>Track a recurring charge.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ChatGPT Plus" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={`${cycle} cost`}><Input inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Billing">
              <Select value={cycle} onValueChange={(v) => setCycle(v as "Monthly" | "Yearly")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <Select value={category} onValueChange={(v) => setCategory(v as SubCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SUB_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Next charge"><Input type="date" value={nextCharge} onChange={(e) => setNextCharge(e.target.value)} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Billing starts"><Input type="date" value={billingStart} onChange={(e) => setBillingStart(e.target.value)} /></Field>
            <Field label="Billing ends (optional)"><Input type="date" value={billingEnd} onChange={(e) => setBillingEnd(e.target.value)} /></Field>
          </div>
          <AccountField value={accountId} onChange={setAccountId} />
          <Button onClick={submit} disabled={busy} className="w-full gradient-primary text-primary-foreground border-0 shadow-glow">
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Save subscription"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReceiptDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const parse = useServerFn(parseReceipt);
  const { add } = useExpenses();
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => { if (!open) { setPreview(null); setBusy(false); } }, [open]);

  const handleFile = async (file: File) => {
    setBusy(true);
    setPreview(URL.createObjectURL(file));
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(buf).toString("base64");

      const result = await parse({ data: { imageBase64: base64, mimeType: file.type || "image/jpeg" } });

      if (!result.total || result.total <= 0) {
        toast.error("Couldn't read a total. Try a clearer photo.");
        setBusy(false);
        return;
      }
      await add({
        date: result.date || todayISO(),
        description: result.description || result.merchant || "Receipt",
        category: result.category,
        cost: result.total,
        note: result.merchant ? `Receipt · ${result.merchant}` : "Receipt",
      });
      toast.success(`Expense added: ${result.merchant || result.description || "Receipt"}`);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Receipt scan failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/10">
        <DialogHeader>
          <DialogTitle>Scan a receipt</DialogTitle>
          <DialogDescription>Take a photo — we'll extract the total and add it to expenses.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full aspect-[4/3] rounded-2xl border border-dashed border-white/15 grid place-items-center text-center overflow-hidden bg-black/30 hover:bg-black/40 transition-smooth"
          >
            {preview ? (
              <img src={preview} alt="Receipt" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="size-14 rounded-full gradient-primary grid place-items-center shadow-glow">
                  <Camera className="size-6 text-primary-foreground" />
                </div>
                <div className="text-sm font-medium text-foreground">Tap to take or upload a photo</div>
                <div className="text-xs">Powered by Lovable AI vision</div>
              </div>
            )}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />

          {busy && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Reading receipt…
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function CategoryPicker({
  kind, value, onChange, builtins, onCreateNav,
}: {
  kind: "income" | "expense";
  value: string;
  onChange: (v: string) => void;
  builtins: readonly string[];
  onCreateNav?: () => void;
}) {
  const { items: custom } = useCustomCategories();
  const merged = mergedCategoryNames(builtins, custom, kind);
  const customMap = new Map(custom.filter((c) => c.kind === kind || c.kind === "both").map((c) => [c.name, c]));
  return (
    <Field label="Category">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {merged.map((name) => {
            const c = customMap.get(name);
            const Icon = c ? getCategoryIcon(c.icon) : null;
            return (
              <SelectItem key={name} value={name}>
                <span className="inline-flex items-center gap-2">
                  {Icon && <Icon className="size-3.5" style={{ color: c?.color }} />}
                  {name}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <Link
        to="/categories"
        onClick={() => onCreateNav?.()}
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
      >
        <Plus className="size-3" /> Create new category
      </Link>
    </Field>
  );
}

// Re-export for convenience
export { X };

