import { cn } from "@/lib/utils";

const map: Record<string, string> = {
  Paid: "bg-success/15 text-success border-success/30",
  Pending: "bg-warning/15 text-warning border-warning/30",
  Overdue: "bg-destructive/15 text-destructive border-destructive/30",
  Active: "bg-success/15 text-success border-success/30",
  Paused: "bg-warning/15 text-warning border-warning/30",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  Won: "bg-success/15 text-success border-success/30",
  Lost: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium",
      map[status] ?? "bg-muted text-muted-foreground border-border",
      className,
    )}>
      {status}
    </span>
  );
}
