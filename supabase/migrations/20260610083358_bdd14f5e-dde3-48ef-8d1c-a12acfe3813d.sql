-- Custom markets watchlist with optional invested amount
CREATE TABLE public.custom_markets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'Custom',
  invested_amount numeric NOT NULL DEFAULT 0,
  baseline_price numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_markets TO authenticated;
GRANT ALL ON public.custom_markets TO service_role;

ALTER TABLE public.custom_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own custom markets"
  ON public.custom_markets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER custom_markets_updated_at
  BEFORE UPDATE ON public.custom_markets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Add coaching report column to past_statements
ALTER TABLE public.past_statements
  ADD COLUMN IF NOT EXISTS coaching jsonb;
