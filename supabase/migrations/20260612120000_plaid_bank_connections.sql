-- Plaid bank connections. SECURITY: these tables hold bank access tokens and
-- have RLS enabled with NO policies — completely invisible and unwritable to
-- clients, even the row owner. Only the server (service role) touches them.
CREATE TABLE public.plaid_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id text NOT NULL UNIQUE,
  access_token text NOT NULL,            -- never exposed to any client
  institution_name text,
  sync_cursor text,
  status text NOT NULL DEFAULT 'active', -- active | error | removed
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER plaid_items_updated_at
  BEFORE UPDATE ON public.plaid_items
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Imported Plaid transaction ids, to guarantee idempotent syncs (no duplicates).
CREATE TABLE public.plaid_transactions (
  id text NOT NULL PRIMARY KEY,          -- Plaid transaction_id
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plaid_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_plaid_tx_user ON public.plaid_transactions (user_id);
