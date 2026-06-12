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

### AI features + Premium subscription

All AI features (receipt scanning, coaching, strategy, chat, ideas,
statement parsing, daily report) run on the Claude API — **Haiku 4.5 by
default** (fastest/cheapest) — and are gated behind the in-app Premium
subscription (R100/month via Paystack). Server env vars:

```sh
ANTHROPIC_API_KEY=<key>                  # console.anthropic.com — required for AI
ANTHROPIC_MODEL=claude-haiku-4-5         # optional override for all features
ANTHROPIC_MODEL_DEEP=claude-haiku-4-5    # optional override for statement parsing + coaching only
AI_RATE_LIMIT=30                         # optional, AI calls per 10 min per user
AI_DAILY_LIMIT=150                       # optional, AI calls per day per user

PAYSTACK_SECRET_KEY=sk_live_...          # dashboard.paystack.com → Settings → API Keys
PAYSTACK_PLAN_CODE=PLN_...               # optional: a R100/month Plan for auto-renewal
SUPABASE_SERVICE_ROLE_KEY=...            # Supabase → Settings → API (server-only!)
OWNER_EMAILS=you@example.com             # comma-separated; owners bypass the paywall
PREMIUM_ENFORCE=true                     # force the paywall on/off explicitly
```

The paywall enforces automatically once `PAYSTACK_SECRET_KEY` is set
(owners excluded). Register the webhook URL
`https://<your-domain>/api/paystack-webhook` in Paystack for auto-renewals.
Live market data needs **no key at all** (Yahoo Finance).

## Scripts

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `bun run dev`    | Dev server with HMR          |
| `bun run build`  | Production build (Nitro SSR) |
| `bun run lint`   | ESLint                       |
| `bun run format` | Prettier                     |
