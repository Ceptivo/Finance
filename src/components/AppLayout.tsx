import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, DollarSign, Briefcase, Repeat, Receipt, BarChart3,
  TrendingUp, FileText, Sparkles, Menu, X, Search, LogOut, LineChart, Wallet, History, Tag, UserCog, Target, ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { AddFAB } from "@/components/AddFAB";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/accounts", label: "Accounts", icon: Wallet },
  { to: "/businesses", label: "Businesses", icon: Briefcase },
  { to: "/earnings", label: "Income", icon: DollarSign },
  { to: "/expenses", label: "Expenses", icon: Receipt },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat },
  { to: "/wealth-shield", label: "Wealth Shield", icon: ShieldCheck },
  { to: "/investments", label: "AI Investment Hub", icon: TrendingUp },
  { to: "/financial-profile", label: "Financial Profile", icon: UserCog },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/forecast", label: "Cash Flow", icon: LineChart },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/past-finances", label: "Past Finances", icon: History },
  { to: "/categories", label: "Categories", icon: Tag },
] as const;

export function AppLayout() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { session } = useSession();
  const [open, setOpen] = useState(false);

  const initials = session?.user.email?.slice(0, 2).toUpperCase() ?? "ME";

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="min-h-screen flex">
      {/* Pure Black Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 flex flex-col",
          "border-r border-emerald-500/10",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={{ background: "#000000" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-emerald-500/10 shrink-0">
          <div className="size-9 rounded-2xl gradient-primary shadow-glow grid place-items-center animate-emerald-pulse">
            <Sparkles className="size-4 text-black" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-tight text-white text-sm">Ceptivo Finance</div>
            <div className="text-[11px] text-emerald-500/60">ZAR · Private</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-2.5 py-3 space-y-0.5 flex-1 overflow-y-auto no-scrollbar">
          {nav.map((item) => {
            const active = item.to === "/"
              ? loc.pathname === "/"
              : loc.pathname === item.to || loc.pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-smooth",
                  active
                    ? "bg-emerald-500/12 text-emerald-400 border border-emerald-500/20"
                    : "text-white/50 hover:text-white hover:bg-white/5 border border-transparent"
                )}
              >
                <Icon className={cn("size-4 shrink-0", active ? "text-emerald-400" : "")} />
                <span className={cn("truncate", active ? "font-semibold" : "")}>{item.label}</span>
                {active && (
                  <span className="ml-auto size-1.5 rounded-full bg-emerald-400 shadow-glow shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 shrink-0 border-t border-emerald-500/10">
          {session && (
            <div className="rounded-2xl p-3 text-xs flex items-center gap-2.5 bg-white/4 border border-white/6">
              <div className="size-8 rounded-xl gradient-primary grid place-items-center text-[11px] font-bold text-black shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate text-white/90">{session.user.email}</div>
                <div className="text-emerald-500/60 text-[10px]">Owner · ZAR</div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-xl hover:bg-emerald-500/15 text-white/40 hover:text-emerald-400 transition shrink-0"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-emerald-500/10 flex items-center gap-3 px-4 lg:px-8 backdrop-blur-2xl"
          style={{ background: "rgba(0,0,0,0.85)" }}
        >
          <button
            className="lg:hidden p-2 -ml-2 rounded-2xl hover:bg-emerald-500/10 text-white/60 hover:text-emerald-400 transition"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <input
              placeholder="Search income, expenses, accounts…"
              className="w-full h-10 pl-9 pr-3 rounded-2xl bg-white/5 border border-emerald-500/15 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
            />
          </div>
          <div className="flex-1 sm:hidden" />
          <div className="size-9 rounded-2xl gradient-primary grid place-items-center text-xs font-bold text-black shadow-glow">
            {initials}
          </div>
        </header>

        <main className="p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
        <footer className="px-4 lg:px-8 pb-24 lg:pb-6 text-[11px] text-white/25 max-w-4xl">
          Educational financial information only · Not regulated financial advice · Consult a qualified financial professional before making investment decisions.
        </footer>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <AddFAB />
    </div>
  );
}
