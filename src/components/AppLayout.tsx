import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Briefcase,
  BarChart3,
  TrendingUp,
  Sparkles,
  Menu,
  X,
  LogOut,
  Wallet,
  Tag,
  Target,
  Crown,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { AddFAB } from "@/components/AddFAB";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getProfile } from "@/lib/investment.functions";
import { setActiveCurrency } from "@/lib/format";
import { useEffect } from "react";
import { GlobalSearch } from "@/components/GlobalSearch";
import { SectionTabs } from "@/components/SectionTabs";

// Merged-tabs navigation: each section entry lands on its first tab; the
// SectionTabs bar above page content switches between the section's pages.
const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, match: ["/"] },
  {
    to: "/accounts",
    label: "Money",
    icon: Wallet,
    match: ["/accounts", "/earnings", "/expenses", "/subscriptions", "/budgets"],
  },
  { to: "/investments", label: "Invest", icon: TrendingUp, match: ["/investments"] },
  {
    to: "/goals",
    label: "Planning",
    icon: Target,
    match: ["/goals", "/forecast", "/financial-profile"],
  },
  {
    to: "/analytics",
    label: "Insights",
    icon: BarChart3,
    match: ["/analytics", "/reports", "/past-finances"],
  },
  {
    to: "/businesses",
    label: "Business",
    icon: Briefcase,
    match: ["/businesses", "/clients", "/pipeline"],
  },
  { to: "/categories", label: "Categories", icon: Tag, match: ["/categories"] },
  { to: "/premium", label: "Premium", icon: Crown, match: ["/premium"] },
] as const;

export function AppLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { session } = useSession();
  const [open, setOpen] = useState(false);

  // Apply the user's saved currency app-wide (defaults to ZAR).
  const profFn = useServerFn(getProfile);
  const profQ = useQuery({ queryKey: ["fin-profile"], queryFn: () => profFn(), staleTime: 60_000 });
  const ccy = (profQ.data as any)?.profile?.currency;
  useEffect(() => {
    if (ccy) setActiveCurrency(ccy);
  }, [ccy]);

  const initials = session?.user.email?.slice(0, 2).toUpperCase() ?? "ME";

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0",
          "glass-strong border-r border-sidebar-border",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <div className="size-9 rounded-xl gradient-primary shadow-glow grid place-items-center">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Ceptivo Finance App</div>
            <div className="text-[11px] text-muted-foreground">Personal · Private</div>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-1">
          {nav.map((item) => {
            const active = item.match.some((m) =>
              m === "/"
                ? loc.pathname === "/"
                : loc.pathname === m || loc.pathname.startsWith(m + "/"),
            );
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth",
                  active
                    ? "bg-accent text-accent-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-primary shadow-glow" />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 inset-x-0 p-4 space-y-2">
          {session && (
            <div className="glass rounded-xl p-3 text-xs flex items-center gap-2">
              <Link
                to="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition"
              >
                <div className="size-8 rounded-full gradient-primary grid place-items-center text-[11px] font-semibold text-primary-foreground">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{session.user.email}</div>
                  <div className="text-muted-foreground text-[10px]">Settings</div>
                </div>
              </Link>
              <button
                onClick={logout}
                className="p-1.5 rounded-md hover:bg-accent"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 glass-strong border-b border-border flex items-center gap-3 px-4 lg:px-8">
          <button
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-accent"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <GlobalSearch />
          <div className="flex-1 sm:hidden" />
          <Link
            to="/settings"
            aria-label="Open settings"
            className="size-9 rounded-full gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground hover:scale-105 transition"
          >
            {initials}
          </Link>
        </header>

        <main className="p-4 lg:p-8 animate-fade-in">
          <SectionTabs />
          <Outlet />
        </main>
        <footer className="px-4 lg:px-8 pb-24 lg:pb-6 text-[11px] text-muted-foreground/80 max-w-4xl">
          Educational financial information only · Not regulated financial advice · Consult a
          qualified financial professional before making investment decisions.
        </footer>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <AddFAB />
    </div>
  );
}
