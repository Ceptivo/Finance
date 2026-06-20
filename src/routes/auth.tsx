import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Lock, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/", replace: true });
  }, [session, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created. Signing you in…");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="min-h-screen grid place-items-center px-4"
      style={{
        background: "#000000",
        backgroundImage: "radial-gradient(900px 600px at 50% -10%, oklch(0.62 0.20 155 / 0.12), transparent 65%)",
      }}
    >
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, oklch(0.62 0.20 155 / 0.10), transparent 70%)" }}
      />

      <div className="w-full max-w-sm animate-fade-in relative">
        <div
          className="rounded-[2rem] p-7 shadow-elegant border"
          style={{
            background: "oklch(0.07 0.006 155 / 0.85)",
            borderColor: "oklch(0.62 0.20 155 / 0.18)",
            backdropFilter: "blur(32px) saturate(180%)",
          }}
        >
          <div className="flex items-center gap-3 mb-7">
            <div className="size-11 rounded-2xl gradient-primary shadow-glow grid place-items-center animate-emerald-pulse">
              <ShieldCheck className="size-5 text-black" />
            </div>
            <div className="leading-tight">
              <div className="font-bold tracking-tight text-white">Ceptivo Finance</div>
              <div className="text-[11px] text-emerald-500/60">Private · ZAR · South Africa</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-xs text-white/40 mt-1 mb-6 flex items-center gap-1.5">
            <Lock className="size-3" /> Your data stays private and encrypted.
          </p>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-white/5 border border-emerald-500/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 pr-11 rounded-2xl bg-white/5 border border-emerald-500/20 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-emerald-400 transition"
              >
                {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-2xl gradient-primary text-black font-bold shadow-glow disabled:opacity-60 transition-smooth hover:scale-[1.01] active:scale-[0.99]"
            >
              {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-white/6">
            <button
              type="button"
              onClick={() => setMode((m) => (m === "signin" ? "signup" : "signin"))}
              className="w-full text-xs text-white/40 hover:text-emerald-400 transition-smooth"
            >
              {mode === "signin"
                ? "First time? Create your account →"
                : "Already have an account? Sign in →"}
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-white/20 mt-5">
          Not financial advice · For personal use only
        </p>
      </div>
    </div>
  );
}
