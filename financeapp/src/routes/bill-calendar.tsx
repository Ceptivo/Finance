import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, AlertCircle, Clock, CheckCircle2, Bell } from "lucide-react";
import { useSubs, useExpenses } from "@/lib/store";
import { fmtMoney } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/bill-calendar")({ component: BillCalendar });

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

type BillEvent = {
  day: number;
  name: string;
  amount: number;
  color: string;
  status: "overdue" | "due-soon" | "upcoming";
};

function BillCalendar() {
  const { items: subs } = useSubs();
  const { items: expenses } = useExpenses();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build bill events for this month
  const events = useMemo<BillEvent[]>(() => {
    const list: BillEvent[] = [];
    const now = new Date();
    const todayDay = now.getDate();
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

    const PALETTE: Record<string, string> = {
      AI: "#A78BFA",
      Software: "#5BA8FF",
      Hosting: "#34D399",
      Entertainment: "#F472B6",
      Productivity: "#E6C07A",
      Other: "#94A3B8",
    };

    for (const s of subs) {
      if (s.status !== "Active") continue;
      const nextDate = s.nextCharge ? new Date(s.nextCharge) : null;
      if (!nextDate) continue;

      // Determine if this bill falls in the displayed month
      let billDay = nextDate.getDate();
      const billMonth = nextDate.getMonth();
      const billYear = nextDate.getFullYear();

      // For calendar display: show recurring bills on the day of month they're charged
      // If the nextCharge is in the future, show it for the displayed month
      const showInMonth =
        (billYear === year && billMonth === month) ||
        (billYear > year || (billYear === year && billMonth > month));

      if (!showInMonth && !(billYear < year || (billYear === year && billMonth < month))) {
        // Only show if it's this month or future recurring
      }

      // Always show on the day number in the displayed calendar (recurring)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      if (billDay > daysInMonth) billDay = daysInMonth;

      let status: BillEvent["status"] = "upcoming";
      if (isCurrentMonth) {
        if (billDay < todayDay) status = "overdue";
        else if (billDay <= todayDay + 7) status = "due-soon";
        else status = "upcoming";
      }

      list.push({
        day: billDay,
        name: s.name,
        amount: s.monthlyCost,
        color: PALETTE[s.category] ?? PALETTE.Other,
        status,
      });
    }

    return list.sort((a, b) => a.day - b.day);
  }, [subs, year, month]);

  // Build calendar grid
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOfMonth).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<number, BillEvent[]>();
    for (const e of events) {
      if (!map.has(e.day)) map.set(e.day, []);
      map.get(e.day)!.push(e);
    }
    return map;
  }, [events]);

  const totalMonth = events.reduce((s, e) => s + e.amount, 0);
  const overdueEvents = events.filter(e => e.status === "overdue");
  const dueSoonEvents = events.filter(e => e.status === "due-soon");

  const today2 = new Date();
  const isCurrentViewMonth = year === today2.getFullYear() && month === today2.getMonth();
  const todayNum = today2.getDate();

  return (
    <>
      <PageHeader
        title="Bill Calendar"
        subtitle="All your recurring bills visualised — never miss a due date again."
      />

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="glass rounded-2xl p-4 shadow-elegant">
          <div className="size-8 rounded-xl bg-rose-500/15 grid place-items-center mb-2">
            <AlertCircle className="size-4 text-rose-400" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Overdue</div>
          <div className="text-xl font-bold text-rose-400">{overdueEvents.length}</div>
        </div>
        <div className="glass rounded-2xl p-4 shadow-elegant">
          <div className="size-8 rounded-xl bg-amber-500/15 grid place-items-center mb-2">
            <Clock className="size-4 text-amber-400" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Due Soon</div>
          <div className="text-xl font-bold text-amber-400">{dueSoonEvents.length}</div>
        </div>
        <div className="glass rounded-2xl p-4 shadow-elegant">
          <div className="size-8 rounded-xl bg-emerald-500/15 grid place-items-center mb-2">
            <CalendarDays className="size-4 text-emerald-400" />
          </div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">This Month</div>
          <div className="text-xl font-bold text-emerald-400">{fmtMoney(totalMonth)}</div>
        </div>
      </div>

      {/* Calendar */}
      <div className="glass rounded-2xl p-5 shadow-elegant mb-5">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-5">
          <button onClick={prevMonth} className="size-9 rounded-xl glass grid place-items-center hover:bg-accent transition">
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="font-semibold text-lg">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="size-9 rounded-xl glass grid place-items-center hover:bg-accent transition">
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[11px] uppercase tracking-wider text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (!day) return <div key={idx} />;
            const dayEvents = eventsByDay.get(day) ?? [];
            const isToday = isCurrentViewMonth && day === todayNum;
            const hasOverdue = dayEvents.some(e => e.status === "overdue");
            const hasDueSoon = dayEvents.some(e => e.status === "due-soon");

            return (
              <div
                key={idx}
                className={`min-h-[64px] rounded-xl p-1.5 border transition relative
                  ${isToday ? "border-primary/60 bg-primary/10" : "border-border/40 hover:border-border"}
                  ${hasOverdue ? "border-rose-500/40 bg-rose-500/5" : ""}
                  ${hasDueSoon && !hasOverdue ? "border-amber-500/30 bg-amber-500/5" : ""}
                `}
              >
                <div className={`text-xs font-medium mb-1 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {day}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((e, i) => (
                    <div
                      key={i}
                      className="text-[9px] truncate rounded px-1 py-0.5 font-medium"
                      style={{ background: `${e.color}25`, color: e.color }}
                      title={`${e.name} — ${fmtMoney(e.amount)}`}
                    >
                      {e.name}
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="text-[9px] text-muted-foreground px-1">+{dayEvents.length - 2} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bill list */}
      <div className="glass rounded-2xl p-5 shadow-elegant">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="size-4 text-primary" />
          <h3 className="font-semibold">All Bills This Month</h3>
          <span className="text-xs text-muted-foreground ml-auto">{fmtMoney(totalMonth)} total</span>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="size-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No subscriptions found.</p>
            <p className="text-xs text-muted-foreground/60">Add subscriptions to see them here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {events.map((e, i) => (
              <li key={i} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <div
                  className="size-9 shrink-0 rounded-xl grid place-items-center text-[10px] font-bold"
                  style={{ background: `${e.color}20`, color: e.color }}
                >
                  {e.day}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {MONTHS[month]} {e.day}, {year}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-semibold tabular-nums">{fmtMoney(e.amount)}</div>
                  <StatusBadge status={e.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: BillEvent["status"] }) {
  if (status === "overdue") return (
    <span className="inline-flex items-center gap-1 text-[10px] text-rose-400">
      <AlertCircle className="size-2.5" /> Overdue
    </span>
  );
  if (status === "due-soon") return (
    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
      <Clock className="size-2.5" /> Due soon
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
      <CheckCircle2 className="size-2.5" /> Upcoming
    </span>
  );
}
