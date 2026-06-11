-- Budgets: monthly spending limit per expense category
CREATE TABLE public.budgets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  monthly_limit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budgets" ON public.budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Net worth history: one snapshot per user per day
CREATE TABLE public.net_worth_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date date NOT NULL DEFAULT current_date,
  assets numeric NOT NULL DEFAULT 0,
  liabilities numeric NOT NULL DEFAULT 0,
  net_worth numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);
ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own snapshots" ON public.net_worth_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subscriptions auto-posting bookkeeping: remembers the last renewal that
-- was posted as an expense so charges are never double-posted.
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS last_posted_renewal date;

-- Performance indexes for date-filtered queries
CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON public.incomes (user_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions (user_id, next_renewal);
CREATE INDEX IF NOT EXISTS idx_networth_user_date ON public.net_worth_snapshots (user_id, snapshot_date DESC);
