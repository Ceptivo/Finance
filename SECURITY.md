# Security

This document describes the security posture of Personal Finance Hub and the
rules to follow when extending it (especially for bank integrations like Plaid).

## Current protections

**Authentication & authorization**

- Every page is behind Supabase auth (the root `AuthGate` redirects to `/auth`).
- Every server function uses `requireSupabaseAuth`: the JWT from the
  `Authorization` header is verified server-side (`supabase.auth.getClaims`),
  and the Supabase client used by the handler carries the _user's own_ token —
  so Postgres row-level security applies to every query.
- Every table has RLS policies scoped to `auth.uid() = user_id`. Even a bug in
  app code cannot read another user's rows.
- All handlers additionally filter `.eq("user_id", userId)` (defense in depth).

**Input validation**

- All server-function inputs are validated with zod (types, lengths, ranges,
  UUIDs, enums) before any processing.
- File uploads are size-capped (receipts 8 MB, statements 20 MB) and processed
  server-side only.

**AI endpoints**

- All AI features require authentication (including receipt scanning) and are
  rate-limited per user (default 30 calls / 10 min, configurable via
  `AI_RATE_LIMIT` / `AI_RATE_WINDOW_MS`) to bound API spend and abuse.
- The Anthropic API key lives only in server env (`ANTHROPIC_API_KEY`); it is
  never sent to the browser.

**Transport & browser hardening**

- Security headers on every response: `Strict-Transport-Security`,
  `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` +
  `frame-ancestors 'none'` (clickjacking), `Referrer-Policy`,
  `Permissions-Policy`, and in production a Content-Security-Policy that
  restricts network connections to the app origin and Supabase only.
- The PWA service worker **never caches page HTML or API responses** — only
  hashed static assets. Financial data is never written to disk caches.
- Market data (Yahoo/Finnhub) and AI calls happen exclusively server-side;
  the browser only ever talks to the app origin and Supabase.

**Secrets**

- `.env` is gitignored. The only client-exposed values are the Supabase URL
  and the _publishable_ anon key (safe by design — access is enforced by RLS).
- Server-only secrets: `ANTHROPIC_API_KEY`, optional `FINNHUB_API_KEY`.

## Rules for integrating Plaid (or any bank aggregator)

1. **Access tokens are server-side only — no exceptions.** Plaid `access_token`s
   must never reach the browser, client state, logs, or error reports. Exchange
   the `public_token` for an `access_token` inside a server function and store it
   immediately.
2. **Storage:** create a `plaid_items` table with **no client RLS policies at
   all** (deny by default). Read/write it only with the Supabase
   `service_role` key from server functions — add `SUPABASE_SERVICE_ROLE_KEY`
   to server env (never `VITE_`-prefixed). Prefer encrypting the token column
   (e.g. `pgsodium`/Vault) so a DB dump alone doesn't expose tokens.
3. **Link flow:** the client only ever sees the short-lived `link_token`
   (create it server-side) and returns the one-time `public_token`.
4. **Webhooks:** verify Plaid webhook JWT signatures before trusting any
   payload, and treat webhook bodies as untrusted input (zod-validate).
5. **CSP:** when adding Plaid Link, extend the CSP in `src/server.ts` with
   `https://cdn.plaid.com` (script + frame) — keep everything else locked.
6. **Scopes & data minimization:** request only the Plaid products you use
   (transactions/balance), and store only the fields the app displays.
7. **Deletion:** when a user unlinks a bank, call `/item/remove` at Plaid and
   delete the stored token in the same operation.

## Reporting

This is a private personal project. If you find a vulnerability, open a private
issue or contact the repository owner directly.
