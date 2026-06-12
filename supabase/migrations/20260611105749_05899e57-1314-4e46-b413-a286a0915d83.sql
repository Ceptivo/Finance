
-- Add time-of-day support for incomes and expenses
ALTER TABLE public.incomes ADD COLUMN IF NOT EXISTS occurred_at timestamptz;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS occurred_at timestamptz;

-- Add billing window for subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_start date;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_end date;

-- Add savings goal to financial profile
ALTER TABLE public.users_financial_profiles ADD COLUMN IF NOT EXISTS monthly_savings_goal numeric DEFAULT 0;
