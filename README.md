# Personal Finance Hub

A private personal finance dashboard — track income, expenses, subscriptions, investments, goals, and every side business in one place.

Built with **TanStack Start** (React 19, SSR), **Tailwind CSS v4**, **shadcn/ui**, **Recharts**, and **Supabase** (auth + Postgres with row-level security).

## Features

- **Dashboard** — net worth, cash flow, and KPI overview
- **Accounts** — bank accounts, cards, and liabilities with per-account drill-down
- **Earnings / Expenses** — transaction tracking with category breakdowns and charts
- **Subscriptions** — recurring costs, billing cycles, renewal reminders, and automatic posting of due charges as expenses
- **Budgets** — monthly limit per category with progress bars and dashboard alerts at 80%/100%
- **Investments** — live market quotes, price history, and symbol search (Yahoo Finance, no API key needed); holdings revalued from live prices; custom markets track your invested amount against the market; real portfolio trend chart (1mo–5y)
- **Net worth history** — daily snapshots with a dashboard trend chart
- **Global search** — search income, expenses, subscriptions, and accounts from the header
- **Goals, Forecast, Analytics, Financial Profile** — planning and insight tools
- **Clients, Pipeline, Businesses** — freelance/side-business income management
- **Reports** — AI daily financial health report, plus PDF / Excel / CSV exports
- **Past Finances** — upload old bank statements (PDF, image, or CSV — AI-parsed), sandboxed from live data, with one-click import into your live dashboard
- **Receipt scanning** — add expenses from a photo
- **PWA** — installable on your phone's home screen

## Getting started

```sh
bun install        # or npm install
bun run dev        # starts Vite dev server on port 8080
```

The app requires a Supabase backend. Connection settings live in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — the publishable anon key, safe for the client; data access is enforced by RLS). Database schema is in `supabase/migrations/`.

Sign up / sign in at `/auth` — all routes are gated behind Supabase authentication.

### One-time database migration

After pulling these changes, run the SQL in
`supabase/migrations/20260611140000_budgets_networth_indexes.sql` in your
Supabase dashboard (SQL editor → paste → Run). It creates the budgets and
net-worth tables and adds performance indexes. The app works without it,
but budgets, net-worth history, and no-double-post subscription tracking
need it.

### AI features (optional)

Receipt scanning, AI coaching, investment strategy/chat/ideas, statement
parsing, and the daily report run on the Claude API. Set the server-side
environment variables:

```sh
ANTHROPIC_API_KEY=<your key>      # get one at console.anthropic.com
ANTHROPIC_MODEL=claude-opus-4-8   # optional; e.g. claude-haiku-4-5 for lower cost
```

Without a key, those features show a clear error toast; everything else
works normally. Live market data needs **no key at all** (Yahoo Finance);
set `FINNHUB_API_KEY` optionally as a fallback quote source.

## Scripts

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `bun run dev`    | Dev server with HMR          |
| `bun run build`  | Production build (Nitro SSR) |
| `bun run lint`   | ESLint                       |
| `bun run format` | Prettier                     |
