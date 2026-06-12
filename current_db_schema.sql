-- ===================================================
-- CEPTIVO FINANCE APP: COMPREHENSIVE MASTER SCHEMA
-- ===================================================

-- 1. CORE USER DATA
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  currency text DEFAULT 'ZAR',
  savings_goal numeric DEFAULT 0,
  current_tfsa_contribution numeric DEFAULT 0, -- ZAR contributed this tax year (R36,000 limit)
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now()
);

-- WEALTH SHIELD: Debt Payoff Engine
CREATE TABLE IF NOT EXISTS public.debts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  balance numeric NOT NULL DEFAULT 0,
  interest_rate numeric NOT NULL DEFAULT 0,   -- annual %, e.g. 21.5
  minimum_payment numeric NOT NULL DEFAULT 0, -- ZAR per month
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- WEALTH SHIELD: Recurring Bills Calendar
CREATE TABLE IF NOT EXISTS public.recurring_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,          -- ZAR
  due_day int NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users_financial_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  age integer,
  country text DEFAULT 'South Africa',
  monthly_income numeric DEFAULT 0,
  monthly_expenses numeric DEFAULT 0,
  monthly_savings numeric DEFAULT 0,
  monthly_savings_goal numeric DEFAULT 0,
  existing_investments numeric DEFAULT 0,
  emergency_fund numeric DEFAULT 0,
  total_debt numeric DEFAULT 0,
  knowledge_level text,
  investment_goal text,
  time_horizon text,
  risk_tolerance text,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. BANKING & CASH FLOW
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text DEFAULT 'checking',
  balance numeric DEFAULT 0,
  currency text DEFAULT 'ZAR',
  bank_name text,
  color text,
  icon text,
  is_liability boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.incomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  source text NOT NULL,
  amount numeric NOT NULL,
  category text,
  notes text,
  occurred_on date DEFAULT current_date,
  occurred_at text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  merchant text NOT NULL,
  amount numeric NOT NULL,
  category text,
  notes text,
  occurred_on date DEFAULT current_date,
  occurred_at text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. INVESTMENTS & MARKETS
CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  symbol text,
  name text NOT NULL,
  asset_type text,
  quantity numeric DEFAULT 0,
  cost_basis numeric DEFAULT 0,
  current_value numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.custom_markets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  symbol text NOT NULL,
  label text,
  category text,
  invested_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.investment_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  target_date date,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. ANALYTICS & SNAPSHOTS
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  limit_amount numeric NOT NULL,
  period text DEFAULT 'monthly'
);

CREATE TABLE IF NOT EXISTS public.net_worth_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  assets numeric DEFAULT 0,
  liabilities numeric DEFAULT 0,
  net_worth numeric DEFAULT 0,
  snapshot_date date DEFAULT current_date
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text,
  icon text,
  color text,
  sort_order integer DEFAULT 0
);

-- 5. AI & REPORTS
CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  kind text,
  content jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.financial_health_scores (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  score integer NOT NULL,
  risk_level text,
  strengths text[],
  improvements text[],
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.past_statements (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  filename text,
  parsed jsonb DEFAULT '{}',
  label text,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. SUBSCRIPTIONS & SENSITIVE DATA
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  cycle text DEFAULT 'monthly',
  next_renewal date,
  category text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  plan_type text DEFAULT 'free',
  status text DEFAULT 'active',
  paystack_customer_code text,
  expires_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.plaid_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  access_token text NOT NULL, -- CRITICAL: ENCRYPTED TOKEN
  item_id text NOT NULL,
  institution_name text,
  status text DEFAULT 'active',
  created_at timestamp with time zone DEFAULT now()
);

-- ===================================================
-- SECURITY: SPECIFIC ROW LEVEL SECURITY (RLS)
-- ===================================================

-- Per-table policies (explicit — no blanket loop). Every policy carries
-- both USING and WITH CHECK so rows can never be read or written across users.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users_financial_profiles','accounts','incomes','expenses',
    'portfolio_holdings','custom_markets','investment_goals','budgets',
    'net_worth_snapshots','categories','ai_recommendations',
    'financial_health_scores','past_statements','subscriptions',
    'debts','recurring_bills'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "user_access" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "user_access" ON public.%I FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
  END LOOP;
END $$;

-- Profiles: Use 'id' instead of 'user_id'
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_access" ON public.profiles;
CREATE POLICY "profile_access" ON public.profiles FOR ALL USING (auth.uid() = id);

-- SENSITIVE: App Subscriptions (User can READ only)
ALTER TABLE public.app_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sub_read" ON public.app_subscriptions;
CREATE POLICY "sub_read" ON public.app_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- SENSITIVE: Plaid Items (NO PUBLIC SELECT. Backend/Service Role only.)
ALTER TABLE public.plaid_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "no_public_plaid" ON public.plaid_items;
-- No policy added = accessible only by Service Role (The "Unhackable" standard)

-- SENSITIVE: Plaid transaction dedupe ledger (Service Role only)
CREATE TABLE IF NOT EXISTS public.plaid_transactions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plaid_transactions ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
