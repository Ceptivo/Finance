-- Reconciliation after current_db_schema.sql. Run this AFTER that file.
-- 1) SECURITY: the blanket "user_policy FOR ALL" loop must never apply to
--    sensitive tables. Restore deny-all / read-only postures.
DO $$
BEGIN
  IF to_regclass('public.plaid_items') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "user_policy" ON public.plaid_items';
  END IF;
  IF to_regclass('public.plaid_transactions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "user_policy" ON public.plaid_transactions';
  END IF;
  IF to_regclass('public.app_subscriptions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "user_policy" ON public.app_subscriptions';
    EXECUTE 'DROP POLICY IF EXISTS "read own subscription" ON public.app_subscriptions';
    EXECUTE 'CREATE POLICY "read own subscription" ON public.app_subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 2) Constraints the app relies on (safe if already present)
ALTER TABLE public.budgets ADD CONSTRAINT budgets_user_category_key UNIQUE (user_id, category);
ALTER TABLE public.net_worth_snapshots ADD CONSTRAINT networth_user_date_key UNIQUE (user_id, snapshot_date);

-- 3) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_incomes_user_date ON public.incomes (user_id, occurred_on DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_id, occurred_on DESC);
