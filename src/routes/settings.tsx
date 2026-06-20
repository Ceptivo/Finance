import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getProfile, saveProfile } from "@/lib/investment.functions";
import { getMyPremium } from "@/lib/premium.functions";
import {
  getBankConnections,
  createPlaidLinkToken,
  exchangePlaidToken,
  removeBankConnection,
  syncBankTransactions,
} from "@/lib/plaid.functions";
import { SUPPORTED_CURRENCIES, setActiveCurrency, getActiveCurrency } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  UserCog,
  Crown,
  Landmark,
  ShieldCheck,
  LogOut,
  Loader2,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

declare global {
  interface Window {
    Plaid?: { create: (cfg: any) => { open: () => void } };
  }
}

function loadPlaidLink(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Plaid) return resolve();
    const s = document.createElement("script");
    s.src = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Plaid Link"));
    document.head.appendChild(s);
  });
}

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { session } = useSession();

  /* ---- Profile (currency + savings goal) ---- */
  const profFn = useServerFn(getProfile);
  const saveFn = useServerFn(saveProfile);
  const profQ = useQuery({ queryKey: ["fin-profile"], queryFn: () => profFn(), staleTime: 60_000 });
  const profile: any = (profQ.data as any)?.profile ?? {};

  const [currency, setCurrency] = useState(getActiveCurrency());
  const [savingsGoal, setSavingsGoal] = useState("");
  useEffect(() => {
    if (profile?.currency) setCurrency(profile.currency);
    if (profile?.monthly_savings_goal != null) setSavingsGoal(String(profile.monthly_savings_goal));
  }, [profile?.currency, profile?.monthly_savings_goal]);

  const saveProfileMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          ...Object.fromEntries(
            Object.entries(profile).filter(([k]) =>
              [
                "age",
                "country",
                "monthly_income",
                "monthly_expenses",
                "monthly_savings",
                "existing_investments",
                "emergency_fund",
                "total_debt",
                "knowledge_level",
                "investment_goal",
                "time_horizon",
                "risk_tolerance",
              ].includes(k),
            ),
          ),
          currency,
          monthly_savings_goal: parseFloat(savingsGoal) || 0,
        } as any,
      }),
    onSuccess: () => {
      setActiveCurrency(currency);
      qc.invalidateQueries(); // currency affects every formatted number
      toast.success("Profile saved — currency applied everywhere");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /* ---- Subscription ---- */
  const premiumFn = useServerFn(getMyPremium);
  const premiumQ = useQuery({
    queryKey: ["premium"],
    queryFn: () => premiumFn(),
    staleTime: 30_000,
  });
  const prem = premiumQ.data;
  const premiumActive = prem?.reason === "subscribed" || prem?.reason === "owner";

  /* ---- Bank connections (Plaid) ---- */
  const banksFn = useServerFn(getBankConnections);
  const linkTokenFn = useServerFn(createPlaidLinkToken);
  const exchangeFn = useServerFn(exchangePlaidToken);
  const removeBankFn = useServerFn(removeBankConnection);
  const syncFn = useServerFn(syncBankTransactions);

  const banksQ = useQuery({ queryKey: ["banks"], queryFn: () => banksFn(), staleTime: 30_000 });
  const banks = banksQ.data?.items ?? [];
  const plaidReady = banksQ.data?.configured ?? false;

  const [connecting, setConnecting] = useState(false);
  const connectBank = async () => {
    setConnecting(true);
    try {
      const { linkToken } = await linkTokenFn();
      await loadPlaidLink();
      const handler = window.Plaid!.create({
        token: linkToken,
        onSuccess: async (publicToken: string) => {
          try {
            const r = await exchangeFn({ data: { publicToken } });
            toast.success(`${r.institution ?? "Bank"} connected securely`);
            qc.invalidateQueries({ queryKey: ["banks"] });
          } catch (e: any) {
            toast.error(e?.message ?? "Could not finish connecting");
          }
        },
        onExit: () => setConnecting(false),
      });
      handler.open();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not start bank connection");
    } finally {
      setConnecting(false);
    }
  };

  const sync = useMutation({
    mutationFn: () => syncFn(),
    onSuccess: (r: { imported: number }) => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["incomes"] });
      qc.invalidateQueries({ queryKey: ["banks"] });
      toast.success(
        r.imported > 0
          ? `Synced ${r.imported} new transaction${r.imported === 1 ? "" : "s"} — AI categorized them automatically`
          : "Up to date — no new transactions",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBank = useMutation({
    mutationFn: (id: string) => removeBankFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banks"] });
      toast.success("Bank disconnected and access revoked");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Your profile, subscription, bank connections, and security."
      />

      <div className="grid lg:grid-cols-2 gap-5 max-w-5xl">
        {/* Profile */}
        <section className="glass rounded-2xl p-6 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl bg-accent grid place-items-center">
              <UserCog className="size-5 text-accent-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Profile</h3>
              <p className="text-xs text-muted-foreground">
                Currency, goals, and your financial details
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Currency
              </label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Monthly savings goal
              </label>
              <Input
                className="mt-1"
                inputMode="decimal"
                placeholder="e.g. 2000"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
              />
            </div>
            <Button
              onClick={() => saveProfileMut.mutate()}
              disabled={saveProfileMut.isPending}
              className="w-full gradient-primary text-primary-foreground border-0 shadow-glow"
            >
              {saveProfileMut.isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
              Save profile
            </Button>
            <Link
              to="/financial-profile"
              className="flex items-center justify-between text-sm text-muted-foreground hover:text-foreground rounded-lg border border-border px-3 py-2.5 transition-smooth"
            >
              Full financial profile (income, debt, risk tolerance…)
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* Subscription */}
        <section className="glass rounded-2xl p-6 shadow-elegant">
          <div className="flex items-center gap-3 mb-4">
            <div className="size-10 rounded-xl gradient-primary grid place-items-center shadow-glow">
              <Crown className="size-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Manage subscription</h3>
              <p className="text-xs text-muted-foreground">Premium unlocks every AI feature</p>
            </div>
          </div>
          {premiumQ.isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <div className="space-y-3">
              <div
                className={`rounded-xl px-4 py-3 text-sm flex items-start gap-2 border ${premiumActive ? "bg-emerald-500/10 border-emerald-500/30" : "bg-muted/40 border-border"}`}
              >
                {premiumActive ? (
                  <CheckCircle2 className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="size-4 text-amber-400 mt-0.5 shrink-0" />
                )}
                <div>
                  <div className="font-medium">
                    {prem?.reason === "owner"
                      ? "Owner account — full access"
                      : premiumActive
                        ? "Premium active"
                        : "Free plan"}
                  </div>
                  {prem?.periodEnd && (
                    <div className="text-xs text-muted-foreground">
                      Renews / expires {new Date(prem.periodEnd).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <Link to="/premium">
                <Button variant="outline" className="w-full">
                  {premiumActive
                    ? "View plan details"
                    : `Upgrade — R${prem?.priceZar ?? 100}/month`}
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Bank connections */}
        <section className="glass rounded-2xl p-6 shadow-elegant lg:col-span-2">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-accent grid place-items-center">
                <Landmark className="size-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Bank connections</h3>
                <p className="text-xs text-muted-foreground">
                  One-touch sync via Plaid — transactions imported and AI-categorized automatically
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {banks.length > 0 && (
                <Button variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending}>
                  <RefreshCw className={`size-4 mr-1 ${sync.isPending ? "animate-spin" : ""}`} />{" "}
                  Sync now
                </Button>
              )}
              <Button
                onClick={connectBank}
                disabled={connecting || !plaidReady}
                className="gradient-primary text-primary-foreground border-0 shadow-glow"
              >
                {connecting ? (
                  <Loader2 className="size-4 mr-1 animate-spin" />
                ) : (
                  <Plus className="size-4 mr-1" />
                )}
                Connect bank
              </Button>
            </div>
          </div>

          {!plaidReady && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs text-muted-foreground flex items-start gap-2">
              <AlertTriangle className="size-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Bank sync isn't connected yet — the app owner needs to set{" "}
                <code className="bg-muted/60 px-1 rounded">PLAID_CLIENT_ID</code>,{" "}
                <code className="bg-muted/60 px-1 rounded">PLAID_SECRET</code> and{" "}
                <code className="bg-muted/60 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> on the
                server, and run the latest database migration.
              </span>
            </div>
          )}

          {banks.length > 0 && (
            <ul className="mt-2 divide-y divide-border/60">
              {banks.map((b: any) => (
                <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`size-2 rounded-full ${b.status === "active" ? "bg-emerald-400" : "bg-rose-400"}`}
                    />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.institution_name ?? "Bank"}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.last_synced_at
                          ? `Last synced ${new Date(b.last_synced_at).toLocaleString()}`
                          : "Never synced"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (
                        confirm(
                          `Disconnect ${b.institution_name ?? "this bank"}? Access is revoked at the bank too.`,
                        )
                      )
                        removeBank.mutate(b.id);
                    }}
                    className="p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-destructive"
                    aria-label="Disconnect bank"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-[11px] text-muted-foreground flex items-start gap-1.5">
            <ShieldCheck className="size-3.5 shrink-0 mt-0.5" />
            Your bank login happens inside Plaid — this app never sees your credentials. Access
            tokens are stored server-side in a locked table no browser can read, and you can revoke
            access here at any time.
          </p>
        </section>

        {/* Account */}
        <section className="glass rounded-2xl p-6 shadow-elegant lg:col-span-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-accent grid place-items-center">
                <ShieldCheck className="size-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Account</h3>
                <p className="text-xs text-muted-foreground">{session?.user.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={logout}>
              <LogOut className="size-4 mr-1" /> Sign out
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
