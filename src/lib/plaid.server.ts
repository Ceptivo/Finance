// Server-only Plaid client. SECURITY MODEL:
//  - PLAID_CLIENT_ID / PLAID_SECRET live only in server env.
//  - access_tokens are stored in plaid_items (RLS: no policies — invisible to
//    every client) and only ever read here, via the service-role client.
//  - The browser only ever sees short-lived link_tokens and derived
//    transaction data, never credentials or access tokens.

const PLAID_HOSTS: Record<string, string> = {
  sandbox: "https://sandbox.plaid.com",
  development: "https://development.plaid.com",
  production: "https://production.plaid.com",
};

export function plaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

function plaidHost(): string {
  return PLAID_HOSTS[process.env.PLAID_ENV ?? "sandbox"] ?? PLAID_HOSTS.sandbox;
}

export async function plaidFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  if (!clientId || !secret) {
    throw new Error(
      "Bank connections are not configured yet — the app owner needs to set PLAID_CLIENT_ID and PLAID_SECRET (dashboard.plaid.com).",
    );
  }
  const res = await fetch(`${plaidHost()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, secret, ...body }),
    signal: AbortSignal.timeout(20000),
  });
  const json = (await res.json()) as T & { error_message?: string; error_code?: string };
  if (!res.ok) {
    throw new Error(
      json.error_message || `Plaid request failed (${json.error_code ?? res.status})`,
    );
  }
  return json;
}

export interface PlaidTxn {
  transaction_id: string;
  account_id: string;
  amount: number; // Plaid: positive = money OUT, negative = money IN
  date: string;
  name: string;
  merchant_name?: string | null;
  pending: boolean;
  personal_finance_category?: { primary?: string } | null;
}

export async function createLinkToken(userId: string): Promise<string> {
  const r = await plaidFetch<{ link_token: string }>("/link/token/create", {
    user: { client_user_id: userId },
    client_name: "Finance Hub",
    products: ["transactions"],
    country_codes: (process.env.PLAID_COUNTRY_CODES ?? "US,CA,GB").split(","),
    language: "en",
  });
  return r.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  return plaidFetch<{ access_token: string; item_id: string }>("/item/public_token/exchange", {
    public_token: publicToken,
  });
}

export async function getInstitutionName(accessToken: string): Promise<string | null> {
  try {
    const item = await plaidFetch<{ item: { institution_id?: string } }>("/item/get", {
      access_token: accessToken,
    });
    if (!item.item.institution_id) return null;
    const inst = await plaidFetch<{ institution: { name: string } }>("/institutions/get_by_id", {
      institution_id: item.item.institution_id,
      country_codes: ["US", "CA", "GB", "ZA"],
    });
    return inst.institution.name;
  } catch {
    return null;
  }
}

/** Incremental transaction sync. Returns new transactions + the next cursor. */
export async function syncTransactions(accessToken: string, cursor: string | null) {
  const added: PlaidTxn[] = [];
  let nextCursor = cursor;
  let hasMore = true;
  for (let i = 0; i < 20 && hasMore; i++) {
    const r = await plaidFetch<{
      added: PlaidTxn[];
      next_cursor: string;
      has_more: boolean;
    }>("/transactions/sync", {
      access_token: accessToken,
      ...(nextCursor ? { cursor: nextCursor } : {}),
      count: 250,
    });
    added.push(...r.added);
    nextCursor = r.next_cursor;
    hasMore = r.has_more;
  }
  return { added: added.filter((t) => !t.pending), nextCursor };
}

export async function removeItem(accessToken: string) {
  await plaidFetch("/item/remove", { access_token: accessToken });
}
