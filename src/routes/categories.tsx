import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, Loader2, Tag } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listCategories, addCategory, updateCategory, deleteCategory,
} from "@/lib/categories.functions";
import {
  CATEGORY_ICONS, CATEGORY_ICON_NAMES, CATEGORY_COLORS, getCategoryIcon,
} from "@/lib/category-icons";

export const Route = createFileRoute("/categories")({ component: CategoriesPage });

type Kind = "income" | "expense" | "both";
type Cat = { id: string; name: string; kind: Kind; icon: string; color: string };

function CategoriesPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCategories);
  const addFn = useServerFn(addCategory);
  const updFn = useServerFn(updateCategory);
  const delFn = useServerFn(deleteCategory);

  const { data, isLoading } = useQuery({ queryKey: ["categories"], queryFn: () => listFn() });
  const items: Cat[] = (data?.items ?? []) as any;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Cat | null>(null);

  const upsert = useMutation({
    mutationFn: async (form: Omit<Cat, "id"> & { id?: string }) => {
      if (form.id) {
        await updFn({ data: { id: form.id, patch: { name: form.name, kind: form.kind, icon: form.icon, color: form.color } } });
      } else {
        await addFn({ data: { name: form.name, kind: form.kind, icon: form.icon, color: form.color } });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success("Saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Removed"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = {
    income: items.filter((c) => c.kind === "income" || c.kind === "both"),
    expense: items.filter((c) => c.kind === "expense" || c.kind === "both"),
  };

  return (
    <>
      <PageHeader
        title="Categories"
        subtitle="Build your own categories with icons & colors. Used everywhere you log income or expenses."
        actions={
          <Button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="gradient-primary text-primary-foreground border-0 shadow-glow"
          >
            <Plus className="size-4 mr-1" /> New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center border border-dashed border-border">
          <Tag className="size-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">No custom categories yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Built-in categories still work — add custom ones for a personalised feel.</p>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="size-4 mr-1" /> Create first category
          </Button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          <Section title="Income" cats={grouped.income} onEdit={(c) => { setEditing(c); setDialogOpen(true); }} onRemove={(id) => remove.mutate(id)} />
          <Section title="Expense" cats={grouped.expense} onEdit={(c) => { setEditing(c); setDialogOpen(true); }} onRemove={(id) => remove.mutate(id)} />
        </div>
      )}

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        initial={editing}
        busy={upsert.isPending}
        onSave={(f) => upsert.mutate(f)}
      />
    </>
  );
}

function Section({
  title, cats, onEdit, onRemove,
}: { title: string; cats: Cat[]; onEdit: (c: Cat) => void; onRemove: (id: string) => void }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="text-sm font-semibold mb-3">{title}</div>
      {cats.length === 0 ? (
        <div className="text-xs text-muted-foreground py-6 text-center">No {title.toLowerCase()} categories yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {cats.map((c) => {
            const Icon = getCategoryIcon(c.icon);
            return (
              <div key={c.id} className="group relative rounded-xl border border-border/60 p-3 hover:border-primary/40 transition">
                <div className="flex items-center gap-2">
                  <div className="size-9 rounded-lg grid place-items-center shrink-0" style={{ background: `${c.color}22`, color: c.color }}>
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.kind}</div>
                  </div>
                </div>
                <div className="absolute right-1.5 top-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => onEdit(c)} className="p-1 rounded hover:bg-accent text-muted-foreground" aria-label="Edit"><Pencil className="size-3" /></button>
                  <button onClick={() => { if (confirm(`Delete "${c.name}"?`)) onRemove(c.id); }} className="p-1 rounded hover:bg-accent text-destructive" aria-label="Delete"><Trash2 className="size-3" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryDialog({
  open, onOpenChange, initial, onSave, busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Cat | null;
  busy: boolean;
  onSave: (form: Omit<Cat, "id"> & { id?: string }) => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("expense");
  const [icon, setIcon] = useState("Tag");
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  // Reset when opened
  const isOpenChanged = (v: boolean) => {
    if (v) {
      setName(initial?.name ?? "");
      setKind(initial?.kind ?? "expense");
      setIcon(initial?.icon ?? "Tag");
      setColor(initial?.color ?? CATEGORY_COLORS[0]);
    }
    onOpenChange(v);
  };

  const submit = () => {
    if (!name.trim()) { toast.error("Name required"); return; }
    onSave({ id: initial?.id, name: name.trim(), kind, icon, color });
  };

  const Preview = getCategoryIcon(icon);

  return (
    <Dialog open={open} onOpenChange={isOpenChanged}>
      <DialogContent className="glass-strong border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Pick a name, icon, color, and where it applies.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-2 p-3 rounded-xl bg-muted/40">
          <div className="size-12 rounded-xl grid place-items-center" style={{ background: `${color}22`, color }}>
            <Preview className="size-6" />
          </div>
          <div>
            <div className="text-sm font-semibold">{name || "Preview"}</div>
            <div className="text-[11px] uppercase text-muted-foreground">{kind}</div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Coffee runs" />
            </label>
            <label className="block">
              <div className="text-xs text-muted-foreground mb-1">Type</div>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Color</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`size-7 rounded-full border-2 transition ${color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1.5">Icon</div>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border p-2 grid grid-cols-8 sm:grid-cols-10 gap-1.5">
              {CATEGORY_ICON_NAMES.map((n) => {
                const I = CATEGORY_ICONS[n];
                const active = n === icon;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setIcon(n)}
                    title={n}
                    className={`size-8 rounded-md grid place-items-center transition ${active ? "ring-2 ring-primary" : "hover:bg-accent"}`}
                    style={active ? { background: `${color}22`, color } : undefined}
                  >
                    <I className="size-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              <X className="size-4 mr-1" /> Cancel
            </Button>
            <Button onClick={submit} disabled={busy} className="flex-1 gradient-primary text-primary-foreground border-0 shadow-glow">
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4 mr-1" />}
              {initial ? "Save changes" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
