-- ===================================================
-- CEPTIVO FINANCE APP: MASTER DATABASE SCHEMA (ZAR)
-- ===================================================

-- 1. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  currency text DEFAULT 'ZAR',
  savings_goal numeric DEFAULT 0,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. FINANCIAL PROFILES (AI Context)
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

-- 3. BANK ACCOUNTS
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

-- 4. CASH FLOW (Incomes & Expenses)
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

-- 5. ANALYTICS & GOALS
CREATE TABLE IF NOT EXISTS public.budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  category text NOT NULL,
  limit_amount numeric NOT NULL,
  period text DEFAULT 'monthly'
);

CREATE TABLE IF NOT EXISTS public.investment_goals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  target_date date
);

CREATE TABLE IF NOT EXISTS public.net_worth_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  assets numeric DEFAULT 0,
  liabilities numeric DEFAULT 0,
  net_worth numeric DEFAULT 0,
  snapshot_date date DEFAULT current_date
);

-- 6. SECURITY PROTOCOL (RLS)
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != 'profiles'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "user_policy" ON public.%I', t);
    EXECUTE format('CREATE POLICY "user_policy" ON public.%I FOR ALL USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_policy" ON public.profiles;
CREATE POLICY "profile_policy" ON public.profiles FOR ALL USING (auth.uid() = id);
