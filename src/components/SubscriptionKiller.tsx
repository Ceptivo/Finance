import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { auditSubscriptions, cancelAssist } from "@/lib/subscription-killer.functions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtMoney } from "@/lib/format";
import { Skull, Loader2, Copy, Mail, Scissors } from "lucide-react";
import { toast } from "sonner";

/** "Zombie subscription" audit + AI-generated cancellation assistant. */
export function SubscriptionKiller() {
  const auditFn = useServerFn(auditSubscriptions);
  const assistFn = useServerFn(cancelAssist);
  const [assist, setAssist] = useState<{ name: string; data: any } | null>(null);

  const audit = useMutation({
    mutationFn: () => auditFn(),
    onError: (e: Error) => toast.error(e.message),
  });
  const r: any = audit.data;

  const openAssist = useMutation({
    mutationFn: (v: { name: string; amount?: number }) => assistFn({ data: v }),
    onSuccess: (data, v) => setAssist({ name: v.name, data }),
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (text: string, what: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${what} copied`),
      () => toast.error("Could not copy"),
    );
  };

  const tone = (v: string) =>
    v === "cancel"
      ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
      : v === "review"
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";

  return (
    <div className="glass rounded-2xl p-5 shadow-elegant border border-primary/20 mt-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow">
            <Skull className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">Zombie Subscription Killer</h3>
            <p className="text-xs text-muted-foreground">
              AI hunts duplicates, overlaps, and poor value — then writes the cancellation email for
              you.
            </p>
          </div>
        </div>
        <Button
          onClick={() => audit.mutate()}
          disabled={audit.isPending}
          className="gradient-primary text-primary-foreground border-0 shadow-glow"
        >
          {audit.isPending ? (
            <Loader2 className="size-4 mr-2 animate-spin" />
          ) : (
            <Scissors className="size-4 mr-2" />
          )}
          {r ? "Re-run audit" : "Hunt zombies"}
        </Button>
      </div>

      {r && (
        <div className="mt-4 space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">{r.summary}</span>{" "}
            {Number(r.totalMonthlySaving) > 0 && (
              <span className="font-semibold text-emerald-400">
                Potential saving: {fmtMoney(Number(r.totalMonthlySaving))}/mo (
                {fmtMoney(Number(r.totalMonthlySaving) * 12)}/yr)
              </span>
            )}
          </div>
          <ul className="space-y-2">
            {(r.verdicts ?? []).map((v: any) => (
              <li
                key={v.name}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/60 px-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{v.name}</span>
                    <span
                      className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${tone(v.verdict)}`}
                    >
                      {v.verdict}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{v.reason}</div>
                </div>
                {v.verdict !== "keep" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={openAssist.isPending}
                    onClick={() =>
                      openAssist.mutate({
                        name: v.name,
                        amount: Number(v.monthlySaving) || undefined,
                      })
                    }
                  >
                    {openAssist.isPending ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "AI, cancel this"
                    )}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={!!assist} onOpenChange={(o) => !o && setAssist(null)}>
        <DialogContent className="glass-strong border-white/10 max-w-xl max-h-[85vh] overflow-y-auto">
          {assist && (
            <>
              <DialogHeader>
                <DialogTitle>Cancel {assist.name}</DialogTitle>
                <DialogDescription>
                  Ready-to-send email + the fastest cancellation path.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Where to cancel
                  </div>
                  <p>{assist.data.unsubscribeHint}</p>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                    Steps
                  </div>
                  <ol className="list-decimal list-inside space-y-1">
                    {(assist.data.steps ?? []).map((step: string) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      Cancellation email
                    </div>
                    <button
                      onClick={() =>
                        copy(
                          `Subject: ${assist.data.emailSubject}\n\n${assist.data.emailBody}`,
                          "Email",
                        )
                      }
                      className="text-xs inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Copy className="size-3" /> Copy
                    </button>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-3 text-xs whitespace-pre-wrap leading-relaxed">
                    <div className="font-semibold mb-2">{assist.data.emailSubject}</div>
                    {assist.data.emailBody}
                  </div>
                </div>
                <a
                  href={`mailto:?subject=${encodeURIComponent(assist.data.emailSubject ?? "")}&body=${encodeURIComponent(assist.data.emailBody ?? "")}`}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-lg gradient-primary text-primary-foreground text-sm font-medium shadow-glow"
                >
                  <Mail className="size-4" /> Open in email app
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
