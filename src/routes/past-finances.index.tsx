import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Trash2, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listStatements, uploadStatement, deleteStatement } from "@/lib/past-statements.functions";

export const Route = createFileRoute("/past-finances/")({ component: PastFinancesPage });

function fmt(n: number, cur = "USD") {
  try { return new Intl.NumberFormat(undefined, { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n); }
  catch { return `${cur} ${Math.round(n).toLocaleString()}`; }
}

function PastFinancesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listStatements);
  const upFn = useServerFn(uploadStatement);
  const delFn = useServerFn(deleteStatement);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["past-statements"], queryFn: () => listFn() });
  const items = (data?.items ?? []) as any[];

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["past-statements"] }),
  });

  const onPick = () => inputRef.current?.click();
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) { toast.error("File too large (max 15MB)"); return; }
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      toast.info("Analyzing statement…");
      await upFn({ data: { filename: file.name, mimeType: file.type || "application/pdf", base64 } });
      toast.success("Statement parsed");
      qc.invalidateQueries({ queryKey: ["past-statements"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Past Finances"
        subtitle="Upload old bank statements to see how things were going — kept completely separate from your live dashboard."
        actions={
          <Button onClick={onPick} disabled={uploading} className="gradient-primary text-primary-foreground shadow-glow border-0">
            {uploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
            {uploading ? "Analyzing…" : "Upload statement"}
          </Button>
        }
      />
      <input ref={inputRef} type="file" accept="application/pdf,image/*" hidden onChange={onFile} />

      <div className="glass rounded-2xl p-4 mb-4 text-xs text-muted-foreground border border-border/50">
        Data from past statements is sandboxed here — it never affects your live Dashboard, Accounts, Income or Expenses.
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-dashed border-border">
          <FileText className="size-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No statements yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Upload a PDF or image of a bank statement to get started.</p>
          <Button onClick={onPick} disabled={uploading}>
            <Upload className="size-4 mr-2" /> Upload statement
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((s) => (
            <Link key={s.id} to="/past-finances/$id" params={{ id: s.id }}
              className="glass rounded-2xl p-5 shadow-elegant hover:-translate-y-0.5 hover:shadow-glow transition-smooth block">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.period_start ?? "—"} → {s.period_end ?? "—"}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-sm">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Income</div>
                  <div className="font-semibold text-emerald-500">{fmt(Number(s.total_income), s.currency)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Expense</div>
                  <div className="font-semibold text-rose-500">{fmt(Number(s.total_expense), s.currency)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Net</div>
                  <div className="font-semibold">{fmt(Number(s.net), s.currency)}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (confirm("Delete this statement?")) remove.mutate(s.id); }}
                  className="text-xs text-muted-foreground hover:text-rose-500 inline-flex items-center gap-1"
                >
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
