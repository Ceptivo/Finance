import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Trophy, Users, Clock, CheckCircle2, Star, ChevronRight,
  Shield, Zap, TrendingUp, AlertCircle, Loader2, Bell, Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/format";
import {
  getActiveChallenge,
  getUserChallengeStatus,
  joinChallenge,
  confirmPayment,
  confirmCompletion,
  getPublishedWinners,
  joinWaitlist,
} from "@/lib/challenges.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/challenges")({ component: ChallengesPage });

/* ─── Countdown hook ───────────────────────────────────────────────────────── */
function useCountdown(targetDate: string | null) {
  const [time, setTime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setTime({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        return;
      }
      setTime({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1000),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return time;
}

/* ─── Main page ────────────────────────────────────────────────────────────── */
function ChallengesPage() {
  const qc = useQueryClient();
  const [showTerms, setShowTerms] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [payingState, setPayingState] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [activeTab, setActiveTab] = useState<"main" | "loser">("main");

  const getChallengeFn = useServerFn(getActiveChallenge);
  const getUserStatusFn = useServerFn(getUserChallengeStatus);
  const joinFn = useServerFn(joinChallenge);
  const confirmPayFn = useServerFn(confirmPayment);
  const completeFn = useServerFn(confirmCompletion);
  const getWinnersFn = useServerFn(getPublishedWinners);
  const waitlistFn = useServerFn(joinWaitlist);

  const challengeQ = useQuery({
    queryKey: ["active-challenge"],
    queryFn: () => getChallengeFn(),
    staleTime: 30_000,
  });
  const statusQ = useQuery({
    queryKey: ["user-challenge-status"],
    queryFn: () => getUserStatusFn(),
    staleTime: 10_000,
  });
  const winnersQ = useQuery({
    queryKey: ["challenge-winners"],
    queryFn: () => getWinnersFn(),
    staleTime: 60_000,
  });

  const challenge: any = (challengeQ.data as any)?.challenge ?? null;
  const stats: any = (challengeQ.data as any)?.stats ?? null;
  const userStatus = (statusQ.data as any)?.status ?? "not_joined";
  const participant: any = (statusQ.data as any)?.participant ?? null;
  const winners: any[] = (winnersQ.data as any)?.winners ?? [];

  const mainWinners = winners.filter((w: any) => w.draw_type === "main");
  const loserWinners = winners.filter((w: any) => w.draw_type === "loser");

  const endDate = challenge?.end_date ?? null;
  const countdown = useCountdown(endDate ? endDate + "T23:59:59" : null);

  const communityAmount = useMemo(() => {
    const count = stats?.paid ?? 0;
    const target = challenge?.target_amount ?? 0;
    return count * target;
  }, [stats, challenge]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["active-challenge"] });
    qc.invalidateQueries({ queryKey: ["user-challenge-status"] });
  };

  // Join + pay flow
  const handleJoin = async () => {
    if (!challenge) return;
    setPayingState("processing");
    try {
      const res = await joinFn({ data: { challenge_id: challenge.id } });
      const pid = (res as any).participant?.id;
      // Simulate payment (replace with Paystack/Peach in production)
      await confirmPayFn({ data: { participant_id: pid, provider_ref: "demo_" + Date.now() } });
      setPayingState("success");
      invalidate();
      toast.success("You're in! Start working on your challenge.");
    } catch (e: any) {
      setPayingState("failed");
      toast.error(e?.message ?? "Payment failed. Please try again.");
    }
  };

  // Confirm completion
  const completeMutation = useMutation({
    mutationFn: () => completeFn({ data: { challenge_id: challenge.id } }),
    onSuccess: () => {
      toast.success("✓ Completion confirmed! You're now qualified for the draw.");
      setShowConfirmModal(false);
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to confirm completion."),
  });

  const capPct = stats ? Math.round((stats.paid / stats.cap) * 100) : 0;

  if (challengeQ.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <Trophy className="size-12 mx-auto text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Challenge</h2>
        <p className="text-muted-foreground text-sm">
          There's no Smart Money Challenge running this month. Check back soon — a new challenge opens every month.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10 max-w-2xl mx-auto lg:max-w-none">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div
        className="relative rounded-3xl overflow-hidden p-6 lg:p-8"
        style={{
          background: "linear-gradient(145deg, oklch(0.18 0.030 155), oklch(0.13 0.015 155) 55%, oklch(0.11 0.005 270))",
          border: "1px solid oklch(0.72 0.19 155 / 0.28)",
        }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.19 155 / 0.18) 0%, transparent 70%)", transform: "translate(35%,-35%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 pointer-events-none"
          style={{ background: "radial-gradient(circle, oklch(0.72 0.19 155 / 0.08) 0%, transparent 70%)", transform: "translate(-30%,40%)" }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow">
              <Trophy className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xs text-white/50 uppercase tracking-widest">Smart Money Challenge</div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{ background: "oklch(0.72 0.19 155 / 0.25)", color: "oklch(0.82 0.17 155)" }}>
                  ● Active
                </span>
                <span className="text-[11px] text-white/40">{new Date().toLocaleString("en-ZA", { month: "long", year: "numeric" })}</span>
              </div>
            </div>
          </div>

          <h1 className="text-2xl lg:text-3xl font-bold text-white mb-2">{challenge.title}</h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-lg">{challenge.description}</p>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl p-3 text-center" style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
              <Crown className="size-4 mx-auto text-amber-400 mb-1" />
              <div className="text-xs text-white/40">Main Prize</div>
              <div className="text-sm font-bold text-white">3 Mo Premium</div>
              <div className="text-[10px] text-white/40">R300 value</div>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
              <Star className="size-4 mx-auto text-emerald-400 mb-1" />
              <div className="text-xs text-white/40">Loser Draw</div>
              <div className="text-sm font-bold text-white">1 Mo Premium</div>
              <div className="text-[10px] text-white/40">R100 value</div>
            </div>
            <div className="rounded-2xl p-3 text-center" style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
              <Zap className="size-4 mx-auto text-violet-400 mb-1" />
              <div className="text-xs text-white/40">Entry Fee</div>
              <div className="text-sm font-bold text-white">R10.00</div>
              <div className="text-[10px] text-white/40">once off</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left col: join + countdown + community */}
        <div className="lg:col-span-2 space-y-4">

          {/* Join / Status Card */}
          <JoinCard
            userStatus={userStatus}
            participant={participant}
            stats={stats}
            challenge={challenge}
            payingState={payingState}
            onJoin={handleJoin}
            onComplete={() => setShowConfirmModal(true)}
            onTerms={() => setShowTerms(true)}
            onWaitlist={() => waitlistFn({ data: { challenge_id: challenge.id } }).then(() => toast.success("We'll notify you when the next challenge opens!"))}
          />

          {/* Countdown */}
          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="size-4 text-primary" />
              <span className="font-semibold text-sm">
                {countdown.expired ? "Challenge Ended" : "Challenge ends in"}
              </span>
            </div>
            {countdown.expired ? (
              <div className="text-center py-2 text-muted-foreground text-sm">
                This month's challenge has ended. Draw results coming soon.
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: countdown.days, label: "Days" },
                  { v: countdown.hours, label: "Hours" },
                  { v: countdown.minutes, label: "Mins" },
                  { v: countdown.seconds, label: "Secs" },
                ].map(({ v, label }) => (
                  <div key={label} className="rounded-2xl text-center p-3"
                    style={{ background: "oklch(0.18 0.020 155 / 0.6)", border: "1px solid oklch(0.72 0.19 155 / 0.15)" }}>
                    <div className="text-2xl font-bold tabular-nums text-white">{String(v).padStart(2, "0")}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 text-[11px] text-muted-foreground text-center">
              Complete and confirm before {new Date(challenge.end_date + "T23:59:59").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>

          {/* Community Tracker */}
          {stats && (
            <div className="glass rounded-2xl p-5 shadow-elegant">
              <div className="flex items-center gap-2 mb-3">
                <Users className="size-4 text-primary" />
                <span className="font-semibold text-sm">Community Tracker</span>
              </div>
              <p className="text-sm text-white">
                <span className="text-emerald-400 font-bold">{stats.paid} people</span> have joined this month's Smart Money Challenge.
              </p>
              {communityAmount > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Together, the community has committed to saving{" "}
                  <span className="text-white font-semibold">{fmtMoney(communityAmount)}</span>.
                </p>
              )}
              <div className="mt-3 text-xs text-muted-foreground">
                {stats.qualified} {stats.qualified === 1 ? "person has" : "people have"} qualified for the draw.
              </div>
            </div>
          )}
        </div>

        {/* Right col: cap + qualification steps */}
        <div className="space-y-4">

          {/* Cap Progress */}
          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Spots Claimed</span>
              <span className="text-xs text-muted-foreground">{stats?.paid ?? 0} / {stats?.cap ?? 500}</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${capPct}%`,
                  background: capPct >= 90 ? "oklch(0.65 0.22 25)" : capPct >= 70 ? "oklch(0.82 0.15 80)" : "oklch(0.72 0.19 155)",
                  boxShadow: capPct >= 90 ? "0 0 10px oklch(0.65 0.22 25 / 0.5)" : "0 0 10px oklch(0.72 0.19 155 / 0.4)",
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {stats?.spots_remaining ?? 500} spots remaining this month.
              {capPct >= 80 && <span className="text-amber-400 ml-1">Filling up fast!</span>}
            </div>
            <div className="mt-3 text-[11px] text-muted-foreground/60">
              Only 500 people can join each month. A new challenge opens on the 1st.
            </div>
          </div>

          {/* Qualification Steps */}
          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="text-sm font-semibold mb-4">Your Progress</div>
            {[
              { label: "Pay R10 entry fee", done: ["joined","completed","qualified","main_winner","loser_winner"].includes(userStatus) },
              { label: "Complete the challenge", done: ["completed","qualified","main_winner","loser_winner"].includes(userStatus) },
              { label: "Confirm completion", done: ["qualified","main_winner","loser_winner"].includes(userStatus) },
              { label: "Qualify for draw", done: ["qualified","main_winner","loser_winner"].includes(userStatus) },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <div className={`size-6 rounded-full grid place-items-center shrink-0 ${step.done ? "bg-emerald-500/20" : "bg-muted"}`}>
                  {step.done
                    ? <CheckCircle2 className="size-3.5 text-emerald-400" />
                    : <span className="size-2 rounded-full bg-muted-foreground/40 block" />}
                </div>
                <span className={`text-xs ${step.done ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* Challenge dates */}
          <div className="glass rounded-2xl p-5 shadow-elegant">
            <div className="text-sm font-semibold mb-3">Key Dates</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Challenge opens</span>
                <span>{new Date(challenge.start_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Challenge ends</span>
                <span>{new Date(challenge.end_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reward draw</span>
                <span className="text-emerald-400">{new Date(challenge.draw_date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly cap</span>
                <span>500 participants</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Previous Winners ──────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 shadow-elegant">
        <div className="flex items-center gap-2 mb-4">
          <Crown className="size-4 text-amber-400" />
          <h2 className="font-semibold">Wall of Winners</h2>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["main","loser"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition ${activeTab === tab ? "gradient-primary text-primary-foreground shadow-glow" : "glass border border-border/60 text-muted-foreground"}`}
            >
              {tab === "main" ? "🏆 Premium Winners (3-Month)" : "🎉 Loser Draw Winners (1-Month)"}
            </button>
          ))}
        </div>

        {(activeTab === "main" ? mainWinners : loserWinners).length === 0 ? (
          <div className="text-center py-10">
            <Trophy className="size-10 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">
              Be the first winner — join this month's challenge!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(activeTab === "main" ? mainWinners : loserWinners).map((w: any) => (
              <WinnerCard key={w.id} winner={w} />
            ))}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-2xl border border-border/40 p-4 text-xs text-muted-foreground/70 leading-relaxed"
        style={{ background: "oklch(0.16 0.004 270 / 0.5)" }}>
        <strong className="text-muted-foreground">Disclaimer:</strong> Smart Money Challenge is a paid financial habit-building programme.
        The R10 entry fee is non-refundable. Completion is self-confirmed on the honour system.
        Winners are selected at random from qualified participants. Prizes are Ceptivo Premium subscription rewards — not cash.
        This is not a lottery, gambling product, or financial instrument.
        Please ensure participation complies with applicable laws in your area.
        Not regulated financial advice. <button onClick={() => setShowTerms(true)} className="text-primary underline">Full Terms</button>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      {showConfirmModal && (
        <ConfirmCompletionModal
          onConfirm={() => completeMutation.mutate()}
          onClose={() => setShowConfirmModal(false)}
          loading={completeMutation.isPending}
        />
      )}
      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  );
}

/* ─── Join Card ────────────────────────────────────────────────────────────── */
function JoinCard({
  userStatus, participant, stats, challenge, payingState,
  onJoin, onComplete, onTerms, onWaitlist,
}: any) {
  if (stats?.cap_reached && userStatus === "not_joined") {
    return (
      <div className="glass rounded-2xl p-6 shadow-elegant border border-rose-500/20 text-center">
        <AlertCircle className="size-8 mx-auto text-rose-400 mb-3" />
        <h3 className="font-semibold text-lg mb-1">This month's challenge is full.</h3>
        <p className="text-sm text-muted-foreground mb-4">
          500 people have already joined. We open a new challenge every month with limited spots — be early next time.
        </p>
        <Button onClick={onWaitlist} variant="outline" className="w-full">
          <Bell className="size-4 mr-2" /> Notify me when next month's challenge opens
        </Button>
      </div>
    );
  }

  if (userStatus === "not_joined") {
    return (
      <div className="glass rounded-2xl p-6 shadow-elegant border border-primary/20">
        <h3 className="font-semibold text-lg mb-1">Ready to take the challenge?</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Pay your R10 community entry and commit to this month's financial goal. Your entry helps fund Premium rewards for the entire community.
        </p>
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            { label: "Entry fee", value: "R10.00" },
            { label: "Monthly cap", value: "500 spots" },
            { label: "Main prize", value: "3 Months Premium" },
            { label: "Loser draw", value: "1 Month Premium" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "oklch(0.18 0.008 155 / 0.5)" }}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
              <div className="text-sm font-semibold mt-0.5">{value}</div>
            </div>
          ))}
        </div>
        {payingState === "processing" && (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground mb-3">
            <Loader2 className="size-4 animate-spin" /> Processing payment…
          </div>
        )}
        {payingState === "failed" && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-sm text-rose-400 mb-3 flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" /> Payment unsuccessful — no amount charged. Please try again.
          </div>
        )}
        <Button
          onClick={onJoin}
          disabled={payingState === "processing"}
          className="w-full gradient-primary text-primary-foreground shadow-glow border-0 h-12 text-base font-semibold"
        >
          {payingState === "processing"
            ? <><Loader2 className="size-4 mr-2 animate-spin" /> Processing…</>
            : "Join for R10 — Pay Now"}
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          By joining, you agree to the{" "}
          <button onClick={onTerms} className="text-primary underline">Smart Money Challenge Terms</button>.
          Entry fee is non-refundable. One entry per user per month.
        </p>
      </div>
    );
  }

  if (payingState === "success" || userStatus === "joined") {
    return (
      <div className="glass rounded-2xl p-6 shadow-elegant border border-emerald-500/20">
        <div className="flex items-start gap-3 mb-4">
          <div className="size-10 rounded-xl bg-emerald-500/15 grid place-items-center shrink-0">
            <CheckCircle2 className="size-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold">You're in! 🎯</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Your R10 entry is confirmed. Work on this month's challenge, then confirm completion to qualify for the draw.
            </p>
          </div>
        </div>
        <Button onClick={onComplete} className="w-full gradient-primary text-primary-foreground shadow-glow border-0 h-11">
          <CheckCircle2 className="size-4 mr-2" /> I completed this month's challenge
        </Button>
      </div>
    );
  }

  if (userStatus === "completed" || userStatus === "qualified") {
    return (
      <div className="glass rounded-2xl p-6 shadow-elegant border border-emerald-500/30"
        style={{ background: "oklch(0.18 0.025 155 / 0.4)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow">
            <Trophy className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-400">✓ Qualified for the Draw!</h3>
            <p className="text-sm text-muted-foreground">
              You've completed the challenge and are entered into the reward draw.
            </p>
          </div>
        </div>
        <div className="rounded-xl p-3 text-sm text-center text-muted-foreground"
          style={{ background: "oklch(0.72 0.19 155 / 0.08)", border: "1px solid oklch(0.72 0.19 155 / 0.15)" }}>
          Results will be published after the draw date. Good luck! 🍀
        </div>
      </div>
    );
  }

  if (userStatus === "main_winner") {
    return (
      <div className="glass rounded-2xl p-6 shadow-elegant border border-amber-500/40 text-center">
        <Crown className="size-12 mx-auto text-amber-400 mb-3" />
        <h3 className="text-xl font-bold text-amber-400">🏆 You Won!</h3>
        <p className="text-sm text-muted-foreground mt-2">Congratulations — you won 3 Months Ceptivo Premium! Your Premium account has been activated.</p>
      </div>
    );
  }

  if (userStatus === "loser_winner") {
    return (
      <div className="glass rounded-2xl p-6 shadow-elegant border border-emerald-500/40 text-center">
        <Star className="size-12 mx-auto text-emerald-400 mb-3" />
        <h3 className="text-xl font-bold text-emerald-400">🎉 Loser Draw Winner!</h3>
        <p className="text-sm text-muted-foreground mt-2">You won 1 Month Ceptivo Premium from the Loser Draw. Your account has been activated.</p>
      </div>
    );
  }

  return null;
}

/* ─── Winner Card ──────────────────────────────────────────────────────────── */
function WinnerCard({ winner }: { winner: any }) {
  const isMain = winner.draw_type === "main";
  return (
    <div
      className="rounded-2xl p-4 border"
      style={{
        background: isMain ? "oklch(0.18 0.025 80 / 0.4)" : "oklch(0.18 0.020 155 / 0.4)",
        borderColor: isMain ? "oklch(0.82 0.15 80 / 0.25)" : "oklch(0.72 0.19 155 / 0.25)",
      }}
    >
      <div className={`size-8 rounded-xl grid place-items-center mb-3 ${isMain ? "bg-amber-500/20" : "bg-emerald-500/20"}`}>
        {isMain ? <Crown className="size-4 text-amber-400" /> : <Star className="size-4 text-emerald-400" />}
      </div>
      <div className="font-semibold text-sm">{winner.display_username}</div>
      <div className={`text-xs mt-0.5 ${isMain ? "text-amber-400" : "text-emerald-400"}`}>
        {winner.prize_description}
      </div>
      {winner.achievement_text && (
        <div className="text-[11px] text-muted-foreground mt-1 italic">"{winner.achievement_text}"</div>
      )}
      <div className="text-[10px] text-muted-foreground/60 mt-2">{winner.challenge_month}</div>
    </div>
  );
}

/* ─── Confirm Completion Modal ─────────────────────────────────────────────── */
function ConfirmCompletionModal({ onConfirm, onClose, loading }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-3xl p-6 shadow-elegant max-w-sm w-full border border-primary/20">
        <h3 className="font-semibold text-lg mb-2">Confirm your completion</h3>
        <p className="text-sm text-muted-foreground mb-5">
          By confirming, you acknowledge that you have completed the challenge in good faith.
          This qualifies you for the monthly reward draw.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1" disabled={loading}>
            Not yet
          </Button>
          <Button onClick={onConfirm} disabled={loading} className="flex-1 gradient-primary text-primary-foreground shadow-glow border-0">
            {loading ? <><Loader2 className="size-4 mr-2 animate-spin" /> Confirming…</> : "Yes, I completed it"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Terms Modal ──────────────────────────────────────────────────────────── */
function TermsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-3xl p-6 shadow-elegant max-w-md w-full border border-border/60 max-h-[80vh] overflow-y-auto">
        <h3 className="font-semibold text-lg mb-4">Smart Money Challenge — Terms & Conditions</h3>
        <div className="text-xs text-muted-foreground space-y-3 leading-relaxed">
          {[
            ["Entry", "Entry fee is R10 per user per month. One entry per user per challenge. The entry fee is non-refundable."],
            ["Eligibility", "Open to all registered Ceptivo users (Free and Premium). Users must be 18 or older."],
            ["Completion", "Completion is self-confirmed on the honour system. False claims may result in disqualification."],
            ["Reward Draw", "Only users who paid the entry fee and confirmed completion qualify. Main draw: 1 winner. Loser draw: 1 winner from remaining qualified users. Same user cannot win both."],
            ["Prizes", "Main prize: 3 months Premium (R300 value). Loser draw: 1 month Premium (R100 value). Prizes are subscription rewards — not cash."],
            ["Winner Selection", "Winners are selected at random. Published by username only."],
            ["Legal", "This is a paid challenge programme with a reward draw. Not a lottery, gambling product, or financial instrument. Confirm compliance with applicable local laws."],
          ].map(([title, body]) => (
            <div key={title as string}>
              <strong className="text-foreground">{title}:</strong> {body}
            </div>
          ))}
        </div>
        <Button onClick={onClose} className="w-full mt-5 gradient-primary text-primary-foreground shadow-glow border-0">
          I understand and agree
        </Button>
      </div>
    </div>
  );
}
