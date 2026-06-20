import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, DollarSign, Receipt, Repeat, Wallet } from "lucide-react";
import { useIncomes, useExpenses, useSubs, useAccounts } from "@/lib/store";
import { fmtMoney } from "@/lib/format";

interface Result {
  kind: "income" | "expense" | "subscription" | "account";
  id: string;
  title: string;
  sub: string;
  amount: number;
  to: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const incomes = useIncomes();
  const expenses = useExpenses();
  const subs = useSubs();
  const accounts = useAccounts();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: Result[] = [];

    for (const i of incomes.items) {
      if (`${i.source} ${i.category} ${i.note ?? ""}`.toLowerCase().includes(q)) {
        hits.push({
          kind: "income",
          id: i.id,
          title: i.source,
          sub: `${i.category} · ${i.date}`,
          amount: i.amount,
          to: "/earnings",
        });
      }
    }
    for (const e of expenses.items) {
      if (`${e.description} ${e.category} ${e.note ?? ""}`.toLowerCase().includes(q)) {
        hits.push({
          kind: "expense",
          id: e.id,
          title: e.description,
          sub: `${e.category} · ${e.date}`,
          amount: -e.cost,
          to: "/expenses",
        });
      }
    }
    for (const s of subs.items) {
      if (`${s.name} ${s.category}`.toLowerCase().includes(q)) {
        hits.push({
          kind: "subscription",
          id: s.id,
          title: s.name,
          sub: `${s.category} · renews ${s.nextCharge}`,
          amount: -s.monthlyCost,
          to: "/subscriptions",
        });
      }
    }
    for (const a of accounts.items) {
      if (`${a.name} ${a.type}`.toLowerCase().includes(q)) {
        hits.push({
          kind: "account",
          id: a.id,
          title: a.name,
          sub: a.type,
          amount: a.balance,
          to: `/accounts/${a.id}`,
        });
      }
    }
    return hits.slice(0, 12);
  }, [query, incomes.items, expenses.items, subs.items, accounts.items]);

  useEffect(() => setActive(0), [results.length]);

  const go = (r: Result) => {
    setOpen(false);
    setQuery("");
    navigate({ to: r.to });
  };

  const ICONS = {
    income: DollarSign,
    expense: Receipt,
    subscription: Repeat,
    account: Wallet,
  } as const;

  return (
    <div ref={boxRef} className="relative flex-1 max-w-md hidden sm:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && results[active]) go(results[active]);
          else if (e.key === "Escape") setOpen(false);
        }}
        placeholder="Search income, expenses, subscriptions…"
        className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/60 border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute top-12 inset-x-0 z-50 glass-strong border border-border rounded-xl shadow-elegant overflow-hidden max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              No matches for “{query.trim()}”.
            </div>
          ) : (
            results.map((r, i) => {
              const Icon = ICONS[r.kind];
              return (
                <button
                  key={`${r.kind}-${r.id}`}
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-smooth ${i === active ? "bg-accent" : ""}`}
                >
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{r.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                  </span>
                  <span
                    className={`text-xs font-semibold ${r.amount < 0 ? "text-rose-400" : "text-emerald-400"}`}
                  >
                    {r.amount < 0 ? "−" : ""}
                    {fmtMoney(Math.abs(r.amount))}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
