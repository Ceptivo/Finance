import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

// Section groups for the merged-tabs navigation. Every page keeps its own
// route/URL — these tabs are just navigation chrome rendered above content.
export const SECTIONS: Array<{
  label: string;
  tabs: Array<{ to: string; label: string }>;
}> = [
  {
    label: "Money",
    tabs: [
      { to: "/accounts", label: "Accounts" },
      { to: "/earnings", label: "Income" },
      { to: "/expenses", label: "Expenses" },
      { to: "/subscriptions", label: "Subscriptions" },
      { to: "/budgets", label: "Budgets" },
    ],
  },
  {
    label: "Planning",
    tabs: [
      { to: "/wealth-shield", label: "Wealth Shield" },
      { to: "/goals", label: "Goals" },
      { to: "/forecast", label: "Cash Flow" },
      { to: "/financial-profile", label: "Profile" },
    ],
  },
  {
    label: "Insights",
    tabs: [
      { to: "/analytics", label: "Analytics" },
      { to: "/reports", label: "Reports" },
      { to: "/past-finances", label: "Past Finances" },
    ],
  },
  {
    label: "Business",
    tabs: [
      { to: "/businesses", label: "Businesses" },
      { to: "/clients", label: "Clients" },
      { to: "/pipeline", label: "Pipeline" },
    ],
  },
];

export function activeSection(pathname: string) {
  return SECTIONS.find((s) =>
    s.tabs.some((t) => pathname === t.to || pathname.startsWith(t.to + "/")),
  );
}

export function SectionTabs() {
  const { pathname } = useLocation();
  const section = activeSection(pathname);
  if (!section) return null;

  return (
    <div className="mb-5 -mx-1 px-1 overflow-x-auto no-scrollbar">
      <div className="inline-flex items-center gap-1 rounded-xl bg-muted/40 p-1 w-max">
        {section.tabs.map((t) => {
          const active = pathname === t.to || pathname.startsWith(t.to + "/");
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "px-3.5 h-9 grid place-items-center rounded-lg text-sm whitespace-nowrap transition-smooth",
                active
                  ? "bg-background text-foreground shadow-elegant font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
