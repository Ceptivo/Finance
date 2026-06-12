import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  icon?: LucideIcon;
  delta?: number;
  sub?: { label: string; value: string }[];
  className?: string;
}

export function KpiCard({ label, value, icon: Icon, delta, sub, className }: KpiCardProps) {
  return (
    <div className={cn("glass rounded-2xl p-5 shadow-elegant transition-smooth hover:shadow-glow hover:-translate-y-0.5", className)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
        </div>
        {Icon && (
          <div className="size-10 rounded-xl bg-accent grid place-items-center">
            <Icon className="size-5 text-accent-foreground" />
          </div>
        )}
      </div>
      {typeof delta === "number" && (
        <div className={cn(
          "mt-2 inline-flex items-center gap-1 text-xs font-medium",
          delta >= 0 ? "text-success" : "text-destructive"
        )}>
          {delta >= 0 ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
          {Math.abs(delta).toFixed(1)}% vs last month
        </div>
      )}
      {sub && (
        <div className="mt-4 grid grid-cols-2 gap-2 pt-3 border-t border-border">
          {sub.map((s) => (
            <div key={s.label}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</div>
              <div className="text-sm font-medium">{s.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
