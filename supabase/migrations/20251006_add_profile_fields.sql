-- Add profile contact fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT;

-- Add notification preferences (default false)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_product_updates BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_policy_alerts   BOOLEAN NOT NULL DEFAULT false;

-- Optional hints for future readers
COMMENT ON COLUMN public.profiles.phone IS 'User contact phone number';
COMMENT ON COLUMN public.profiles.address IS 'User contact address';
COMMENT ON COLUMN public.profiles.notifications_product_updates IS 'Opt-in for product updates emails';
COMMENT ON COLUMN public.profiles.notifications_policy_alerts   IS 'Opt-in for policy alerts';

-- RLS stays as-is (auth.uid() = id) — no changes required here.
