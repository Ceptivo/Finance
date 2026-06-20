-- App premium subscriptions (R100/month). Users can READ their own row but
-- can never write it — rows are written only by the server (service role)
-- after a verified Paystack payment, so a user cannot grant themselves
-- premium by talking to the database directly.
CREATE TABLE public.app_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive',          -- active | inactive | cancelled
  current_period_end timestamptz,
  provider text NOT NULL DEFAULT 'paystack',
  provider_ref text,                                -- Paystack customer/subscription code
  last_reference text,                              -- last verified transaction reference
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_subscriptions ENABLE ROW LEVEL SECURITY;
-- Read own status only. No INSERT/UPDATE/DELETE policies on purpose.
CREATE POLICY "read own subscription" ON public.app_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER app_subscriptions_updated_at
  BEFORE UPDATE ON public.app_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
