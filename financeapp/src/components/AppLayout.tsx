import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, DollarSign, Briefcase, Repeat, Receipt, BarChart3,
  TrendingUp, FileText, Sparkles, Menu, X, Search, LogOut, LineChart, Wallet, History, Tag, UserCog, Target, Shield, CalendarDays, Bot,
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
  { to: "/investments", label: "AI Investment Hub", icon: TrendingUp },
  { to: "/financial-profile", label: "Financial Profile", icon: UserCog },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/forecast", label: "Cash Flow", icon: LineChart },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/past-finances", label: "Past Finances", icon: History },
  { to: "/categories", label: "Categories", icon: Tag },
  { to: "/wealth-shield", label: "Wealth Shield", icon: Shield },
  { to: "/bill-calendar", label: "Bill Calendar", icon: CalendarDays },
  { to: "/ai-negotiator", label: "AI Negotiator", icon: Bot },
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
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0",
          "glass-strong border-r border-sidebar-border",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <div className="size-9 rounded-xl gradient-primary shadow-glow grid place-items-center">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Finance Hub</div>
            <div className="text-[11px] text-muted-foreground">Personal · Private</div>
          </div>
        </div>
        <nav className="px-3 py-4 space-y-1">
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
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-smooth",
                  active
                    ? "bg-accent text-accent-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="size-4" />
                <span>{item.label}</span>
                {active && <span className="ml-auto size-1.5 rounded-full bg-primary shadow-glow" />}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 inset-x-0 p-4 space-y-2">
          {session && (
            <div className="glass rounded-xl p-3 text-xs flex items-center gap-2">
              <div className="size-8 rounded-full gradient-primary grid place-items-center text-[11px] font-semibold text-primary-foreground">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{session.user.email}</div>
                <div className="text-muted-foreground text-[10px]">Owner</div>
              </div>
              <button onClick={logout} className="p-1.5 rounded-md hover:bg-accent" aria-label="Sign out">
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
          <div className="relative flex-1 max-w-md hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              placeholder="Search income, expenses, subscriptions…"
              className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex-1 sm:hidden" />
          <div className="size-9 rounded-full gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground">
            {initials}
          </div>
        </header>

        <main className="p-4 lg:p-8 animate-fade-in">
          <Outlet />
        </main>
        <footer className="px-4 lg:px-8 pb-24 lg:pb-6 text-[11px] text-muted-foreground/80 max-w-4xl">
          Educational financial information only · Not regulated financial advice · Consult a qualified financial professional before making investment decisions.
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
