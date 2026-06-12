import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { getMyPremium, startPremiumCheckout, confirmPremium } from "@/lib/premium.functions";
import {
  Crown,
  Sparkles,
  Camera,
  FileText,
  GraduationCap,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/premium")({
  component: PremiumPage,
  validateSearch: (s: Record<string, unknown>) => ({
    reference: typeof s.reference === "string" ? s.reference : undefined,
    trxref: typeof s.trxref === "string" ? s.trxref : undefined,
  }),
});

const AI_FEATURES = [
  {
    icon: TrendingUp,
    label: "AI Investment Strategy",
    desc: "Personalised allocation plan from your profile",
  },
  {
    icon: MessageSquare,
    label: "AI Finance Chat",
    desc: "Ask anything about your money, with your data as context",
  },
  {
    icon: Sparkles,
    label: "Daily Health Report",
    desc: "AI reviews your last 30 days and tells you what to do today",
  },
  {
    icon: Camera,
    label: "Receipt Scanning",
    desc: "Snap a receipt — it becomes an expense automatically",
  },
  {
    icon: FileText,
    label: "Statement Parsing",
    desc: "Upload bank statements (PDF/photo/CSV) — AI extracts everything",
  },
  {
    icon: GraduationCap,
    label: "AI Spending Coach",
    desc: "Honest coaching reports with concrete savings numbers",
  },
];

function PremiumPage() {
  const qc = useQueryClient();
  const search = useSearch({ from: "/premium" });
  const statusFn = useServerFn(getMyPremium);
  const checkoutFn = useServerFn(startPremiumCheckout);
  const confirmFn = useServerFn(confirmPremium);

  const q = useQuery({ queryKey: ["premium"], queryFn: () => statusFn(), staleTime: 30_000 });
  const s = q.data;

  // Returning from Paystack with ?reference= — verify and activate.
  const confirmedRef = useRef(false);
  useEffect(() => {
    const ref = search.reference ?? search.trxref;
    if (!ref || confirmedRef.current) return;
    confirmedRef.current = true;
    confirmFn({ data: { reference: ref } })
      .then(() => {
        toast.success("Premium activated — welcome aboard! 🎉");
        qc.invalidateQueries({ queryKey: ["premium"] });
      })
      .catch((e: Error) => toast.error(e.message));
  }, [search.reference, search.trxref, confirmFn, qc]);

  const subscribe = useMutation({
    mutationFn: () => checkoutFn({ data: { origin: window.location.origin } }),
    onSuccess: (r: { url: string }) => {
      window.location.href = r.url;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = s?.reason === "subscribed" || s?.reason === "owner";

  return (
    <>
      <PageHeader
        title="Premium"
        subtitle="Unlock every AI feature with one simple subscription."
      />

      <div className="grid lg:grid-cols-2 gap-5 max-w-4xl">
        {/* Plan card */}
        <div className="glass rounded-2xl p-6 shadow-elegant border border-primary/25 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(60% 60% at 100% 0%, var(--color-primary), transparent 70%)",
            }}
          />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-11 rounded-xl gradient-primary grid place-items-center shadow-glow">
                <Crown className="size-5 text-primary-foreground" />
              </div>
              <div>
                <div className="font-semibold text-lg leading-tight">Finance Hub Premium</div>
                <div className="text-xs text-muted-foreground">
                  All AI features · cancel anytime
                </div>
              </div>
            </div>

            <div className="flex items-baseline gap-1 mb-5">
              <span className="text-4xl font-bold tracking-tight">R{s?.priceZar ?? 100}</span>
              <span className="text-muted-foreground">/month</span>
            </div>

            {q.isLoading ? (
              <div className="h-11 grid place-items-center">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : active ? (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm flex items-start gap-2">
                <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-emerald-300">
                    {s?.reason === "owner" ? "Owner account — full access" : "Premium active"}
                  </div>
                  {s?.periodEnd && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Renews / expires {new Date(s.periodEnd).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Button
                  onClick={() => subscribe.mutate()}
                  disabled={subscribe.isPending || !s?.configured}
                  className="w-full h-11 gradient-primary text-primary-foreground border-0 shadow-glow text-base"
                >
                  {subscribe.isPending ? (
                    <Loader2 className="size-4 mr-2 animate-spin" />
                  ) : (
                    <Crown className="size-4 mr-2" />
                  )}
                  Subscribe with Paystack
                </Button>
                {!s?.configured && (
                  <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs flex items-start gap-2">
                    <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">
                      Payments aren't connected yet — the app owner needs to set{" "}
                      <code className="bg-muted/60 px-1 rounded">PAYSTACK_SECRET_KEY</code> on the
                      server.
                      {s?.enforced
                        ? " AI features are locked until then."
                        : " AI features are currently open while payments are being set up."}
                    </span>
                  </div>
                )}
              </>
            )}

            <p className="mt-4 text-[11px] text-muted-foreground">
              Secure payment via Paystack (card, EFT, SnapScan). Your card details never touch this
              app.
            </p>
          </div>
        </div>

        {/* Feature list */}
        <div className="glass rounded-2xl p-6 shadow-elegant">
          <h3 className="font-semibold mb-4">What Premium unlocks</h3>
          <ul className="space-y-3">
            {AI_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <li key={f.label} className="flex items-start gap-3">
                  <div className="size-8 rounded-lg bg-accent grid place-items-center shrink-0">
                    <Icon className="size-4 text-accent-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{f.label}</div>
                    <div className="text-xs text-muted-foreground">{f.desc}</div>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-5 text-xs text-muted-foreground border-t border-border pt-4">
            Everything else — accounts, income & expense tracking, budgets, subscriptions, live
            market data, goals, analytics, exports — stays{" "}
            <span className="text-foreground font-medium">free forever</span>.
          </p>
        </div>
      </div>
    </>
  );
}
