import { Outlet, useNavigate } from "@tanstack/react-router";
import { Menu, Search } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { AddFAB } from "@/components/AddFAB";
import { Sidebar } from "@/components/layout/Sidebar";

export function AppLayout() {
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
      {/* Sidebar — delegates to the extracted Sidebar component */}
      <Sidebar open={open} onClose={() => setOpen(false)} />

      {/* Main */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 h-16 glass-strong border-b border-border flex items-center gap-3 px-4 lg:px-8">
          <button
            className="lg:hidden p-2 -ml-2 rounded-md hover:bg-accent"
            onClick={() => setOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <Menu className="size-5" />
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
