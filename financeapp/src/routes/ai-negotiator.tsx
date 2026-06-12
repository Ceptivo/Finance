import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/PageHeader";
import {
  Bot, Sparkles, Loader2, Copy, Check, ChevronDown, ChevronUp,
  TrendingDown, Zap, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubs, useExpenses, inMonth } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { analyzeNegotiationOpportunities, type NegotiationOpportunity } from "@/lib/negotiator.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/ai-negotiator")({ component: AiNegotiator });

function AiNegotiator() {
  const { items: subs } = useSubs();
  const { items: expenses } = useExpenses();
  const analyzeFn = useServerFn(analyzeNegotiationOpportunities);

  const [loading, setLoading] = useState(false);
  const [opportunities, setOpportunities] = useState<NegotiationOpportunity[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  // Build top expense categories (last 3 months average)
  const topExpenses = useMemo(() => {
    const now = new Date();
    const catTotals = new Map<string, number>();
    let months = 0;

    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const monthExpenses = expenses.filter(e => e.date.startsWith(ym));
      if (monthExpenses.length > 0) {
        months++;
        for (const e of monthExpenses) {
          catTotals.set(e.category, (catTotals.get(e.category) ?? 0) + e.cost);
        }
      }
    }

    const divisor = Math.max(1, months);
    return [...catTotals.entries()]
      .map(([category, total]) => ({ category, avgMonthly: Math.round(total / divisor) }))
      .sort((a, b) => b.avgMonthly - a.avgMonthly)
      .slice(0, 8);
  }, [expenses]);

  const totalPotentialSavings = opportunities.reduce((s, o) => s + o.estimatedSavings, 0);

  const analyze = async () => {
    if (subs.length === 0 && topExpenses.length === 0) {
      toast.info("Add some subscriptions or expenses first so the AI has data to analyse.");
      return;
    }
    setLoading(true);
    setOpportunities([]);
    try {
      const result = await analyzeFn({
        data: {
          subscriptions: subs.filter(s => s.status === "Active").map(s => ({
            name: s.name,
            category: s.category,
            monthlyCost: s.monthlyCost,
          })),
          topExpenses,
        },
      });
      setOpportunities(result.opportunities ?? []);
      if ((result.opportunities ?? []).length === 0) {
        toast.info("No negotiation opportunities found — your costs look optimised!");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Analysis failed. Check your AI API key.");
    } finally {
      setLoading(false);
    }
  };

  const copyEmail = async (idx: number, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Email copied to clipboard");
  };

  return (
    <>
      <PageHeader
        title="AI Contract Negotiator"
        subtitle="Spot overpaying and get AI-drafted emails to negotiate better deals."
      />

      {/* Hero CTA */}
      <div
        className="relative rounded-3xl overflow-hidden p-6 mb-5"
        style={{
          background: "linear-gradient(145deg, oklch(0.20 0.035 155), oklch(0.14 0.018 155) 60%, oklch(0.12 0.005 270))",
          border: "1px solid oklch(0.72 0.19 155 / 0.25)",
        }}
      >
        <div className="absolute top-0 right-0 w-64 h-64 pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.19 155 / 0.15) 0%, transparent 70%)", transform: "translate(30%,-30%)" }} />
        <div className="relative flex items-start gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Bot className="size-5 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-400">AI Contract Negotiator</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-1">Save money, automatically</h2>
            <p className="text-sm text-white/50">
              The AI scans your subscriptions and top expenses, identifies where you're overpaying,
              and writes ready-to-send negotiation emails for South African providers.
            </p>
            {topExpenses.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {topExpenses.slice(0, 5).map(e => (
                  <span key={e.category} className="text-[11px] px-2 py-1 rounded-full"
                    style={{ background: "oklch(0.72 0.19 155 / 0.15)", color: "oklch(0.82 0.17 155)" }}>
                    {e.category}: {fmtMoney(e.avgMonthly)}/mo
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={analyze}
            disabled={loading}
            className="shrink-0 gradient-primary text-primary-foreground shadow-glow border-0 h-11 px-5"
          >
            {loading ? (
              <><Loader2 className="size-4 mr-2 animate-spin" /> Analysing…</>
            ) : (
              <><Sparkles className="size-4 mr-2" /> {opportunities.length > 0 ? "Re-analyse" : "Find Savings"}</>
            )}
          </Button>
        </div>
      </div>

      {/* Potential savings banner */}
      {totalPotentialSavings > 0 && (
        <div className="glass rounded-2xl p-4 mb-4 border border-emerald-500/20 flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/15 grid place-items-center shrink-0">
            <TrendingDown className="size-5 text-emerald-400" />
          </div>
          <div>
            <div className="font-semibold text-emerald-400">
              Potential saving: {fmtMoney(totalPotentialSavings)}/month
            </div>
            <div className="text-xs text-muted-foreground">
              = {fmtMoney(totalPotentialSavings * 12)}/year if you act on all {opportunities.length} opportunities below
            </div>
          </div>
        </div>
      )}

      {/* Opportunities */}
      {loading ? (
        <div className="glass rounded-2xl p-12 text-center shadow-elegant">
          <Loader2 className="size-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Analysing your spending patterns…</p>
          <p className="text-xs text-muted-foreground/60 mt-1">This may take 10–15 seconds</p>
        </div>
      ) : opportunities.length > 0 ? (
        <div className="space-y-3">
          {opportunities.map((opp, idx) => (
            <div key={idx} className="glass rounded-2xl shadow-elegant overflow-hidden">
              {/* Header */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl gradient-primary grid place-items-center shrink-0 shadow-glow">
                    <Zap className="size-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{opp.name}</h3>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {opp.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{opp.reasoning}</p>
                    <div className="mt-3 flex flex-wrap gap-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Currently Paying</div>
                        <div className="text-lg font-bold text-rose-400">{fmtMoney(opp.currentCost)}/mo</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Potential Saving</div>
                        <div className="text-lg font-bold text-emerald-400">−{fmtMoney(opp.estimatedSavings)}/mo</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Annual Saving</div>
                        <div className="text-lg font-bold text-emerald-400">−{fmtMoney(opp.estimatedSavings * 12)}/yr</div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setExpanded(expanded === idx ? null : idx)}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
                >
                  {expanded === idx ? (
                    <><ChevronUp className="size-4" /> Hide email draft</>
                  ) : (
                    <><ChevronDown className="size-4" /> View negotiation email</>
                  )}
                </button>
              </div>

              {/* Email draft */}
              {expanded === idx && (
                <div className="border-t border-border/60 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Negotiation Email Draft
                    </span>
                    <button
                      onClick={() => copyEmail(idx, opp.emailDraft)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-medium shadow-glow"
                    >
                      {copied === idx ? (
                        <><Check className="size-3" /> Copied!</>
                      ) : (
                        <><Copy className="size-3" /> Copy Email</>
                      )}
                    </button>
                  </div>
                  <div className="rounded-xl bg-muted/40 p-4 text-sm whitespace-pre-wrap leading-relaxed font-mono text-xs">
                    {opp.emailDraft}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground/60 flex items-center gap-1">
                    <AlertCircle className="size-3" /> Review and personalise before sending. Educational only — not regulated financial advice.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : !loading && (
        <div className="glass rounded-2xl p-12 text-center shadow-elegant">
          <Bot className="size-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Ready to find you savings</p>
          <p className="text-xs text-muted-foreground/60">
            Click "Find Savings" above — the AI will analyse your subscriptions and expenses.
          </p>
        </div>
      )}
    </>
  );
}
