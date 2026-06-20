
CREATE TABLE public.past_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  currency TEXT DEFAULT 'USD',
  total_income NUMERIC NOT NULL DEFAULT 0,
  total_expense NUMERIC NOT NULL DEFAULT 0,
  net NUMERIC NOT NULL DEFAULT 0,
  parsed JSONB NOT NULL DEFAULT '{}'::jsonb,
  insights TEXT,
  source_filename TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.past_statements TO authenticated;
GRANT ALL ON public.past_statements TO service_role;

ALTER TABLE public.past_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own past statements" ON public.past_statements
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER past_statements_touch
  BEFORE UPDATE ON public.past_statements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
