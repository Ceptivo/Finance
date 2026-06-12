import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, DollarSign, Briefcase, Repeat, Receipt, BarChart3,
  TrendingUp, FileText, Sparkles, LogOut, LineChart, Wallet, History,
  Tag, UserCog, Target, Shield, CalendarDays, Bot, Trophy, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export const NAV_ITEMS = [
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
  // ─── Smart Money Challenge ───────────────────────────────────────
  { to: "/challenges", label: "Smart Money Challenge", icon: Trophy },
] as const;

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ open = true, onClose }: SidebarProps) {
  const loc = useLocation();
  const navigate = useNavigate();
  const { session } = useSession();

  const initials = session?.user.email?.slice(0, 2).toUpperCase() ?? "ME";

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <aside
      className={cn(
        "fixed lg:sticky top-0 left-0 z-40 h-screen w-64 shrink-0",
        "glass-strong border-r border-sidebar-border",
        "transition-transform duration-300 flex flex-col",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl gradient-primary shadow-glow grid place-items-center">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight">Finance Hub</div>
            <div className="text-[11px] text-muted-foreground">Personal · Private</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-md hover:bg-accent">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="px-3 py-4 flex-1 overflow-y-auto space-y-0.5 no-scrollbar">
        {/* Group dividers */}
        {NAV_ITEMS.map((item, i) => {
          const active =
            item.to === "/"
              ? loc.pathname === "/"
              : loc.pathname === item.to || loc.pathname.startsWith(item.to + "/");
          const Icon = item.icon;

          // Visual group separator before Smart Money Challenge
          const showDivider = item.to === "/challenges";

          return (
            <div key={item.to}>
              {showDivider && (
                <div className="px-3 pt-3 pb-1">
                  <div className="h-px bg-border/60" />
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground/60 pt-2 px-0.5">
                    Community
                  </div>
                </div>
              )}
              <Link
                to={item.to}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-smooth",
                  active
                    ? "bg-accent text-accent-foreground shadow-elegant"
                    : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  // Smart Money Challenge gets special highlight
                  item.to === "/challenges" && !active
                    ? "border border-primary/20 bg-primary/5 hover:bg-primary/10"
                    : "",
                )}
              >
                <Icon className={cn("size-4 shrink-0", item.to === "/challenges" && !active ? "text-amber-400" : "")} />
                <span className={cn("truncate", item.to === "/challenges" && !active ? "text-white/90 font-medium" : "")}>
                  {item.label}
                </span>
                {active && <span className="ml-auto size-1.5 rounded-full bg-primary shadow-glow shrink-0" />}
                {item.to === "/challenges" && !active && (
                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full font-medium shrink-0"
                    style={{ background: "oklch(0.72 0.19 155 / 0.2)", color: "oklch(0.82 0.17 155)" }}>
                    NEW
                  </span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-sidebar-border shrink-0">
        {session && (
          <div className="glass rounded-xl p-3 text-xs flex items-center gap-2">
            <div className="size-8 rounded-full gradient-primary grid place-items-center text-[11px] font-semibold text-primary-foreground shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{session.user.email}</div>
              <div className="text-muted-foreground text-[10px]">Owner</div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-md hover:bg-accent shrink-0"
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
