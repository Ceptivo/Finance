# Personal Finance Hub

A private personal finance dashboard — track income, expenses, subscriptions, investments, goals, and every side business in one place.

Built with **TanStack Start** (React 19, SSR), **Tailwind CSS v4**, **shadcn/ui**, **Recharts**, and **Supabase** (auth + Postgres with row-level security).

## Features

- **Dashboard** — net worth, cash flow, and KPI overview
- **Accounts** — bank accounts, cards, and liabilities with per-account drill-down
- **Earnings / Expenses** — transaction tracking with category breakdowns and charts
- **Subscriptions** — recurring costs, billing cycles, renewal tracking
- **Investments** — portfolio tracking with AI-assisted market prices
- **Goals, Forecast, Analytics, Financial Profile** — planning and insight tools
- **Clients, Pipeline, Businesses** — freelance/side-business income management
- **Reports** — AI daily financial health report, plus PDF / Excel / CSV exports for income, spending, subscriptions, and annual performance
- **Past Finances** — upload old bank statements (AI-parsed), sandboxed from live data
- **Receipt scanning** — add expenses from a photo

## Getting started

```sh
bun install        # or npm install
bun run dev        # starts Vite dev server on port 8080
```

The app requires a Supabase backend. Connection settings live in `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — the publishable anon key, safe for the client; data access is enforced by RLS). Database schema is in `supabase/migrations/`.

Sign up / sign in at `/auth` — all routes are gated behind Supabase authentication.

### AI features (optional)

Receipt scanning, AI coaching, market prices, statement parsing, and the daily report use the Lovable AI Gateway. Set the server-side environment variable:

```sh
LOVABLE_API_KEY=<your key>
```

Without it, those specific features show an error toast; everything else works normally.

## Scripts

| Command          | Description                  |
| ---------------- | ---------------------------- |
| `bun run dev`    | Dev server with HMR          |
| `bun run build`  | Production build (Nitro SSR) |
| `bun run lint`   | ESLint                       |
| `bun run format` | Prettier                     |
