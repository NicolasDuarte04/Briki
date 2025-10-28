-- Add stripe_customer_id column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE NO ACTION,
  stripe_customer_id VARCHAR(255) NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_price_id VARCHAR(255) NOT NULL,
  stripe_product_id VARCHAR(255) NOT NULL,
  plan_code VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  interval VARCHAR(20) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  current_period_start TIMESTAMPTZ(6) NOT NULL,
  current_period_end TIMESTAMPTZ(6) NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  trial_end TIMESTAMPTZ(6),
  cancel_at TIMESTAMPTZ(6),
  canceled_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON public.subscriptions(stripe_subscription_id);

-- Add comment to subscriptions table for documentation
COMMENT ON TABLE public.subscriptions IS 'Stores Stripe subscription data linked to user profiles';

-- Add RLS policy (if you're using row-level security)
-- Enable RLS on subscriptions table
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = user_id
    )
  );

-- Policy: Users can insert their own subscriptions (e.g., via webhook)
CREATE POLICY "Users can insert own subscriptions"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = user_id
    )
  );

-- Policy: Users can update their own subscriptions (e.g., via webhook)
CREATE POLICY "Users can update own subscriptions"
  ON public.subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = user_id
    )
  );

-- Policy: System can delete subscriptions (e.g., when canceled)
CREATE POLICY "System can delete subscriptions"
  ON public.subscriptions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = user_id
    )
  );

