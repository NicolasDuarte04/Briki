-- Add locale column to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS locale TEXT NOT NULL DEFAULT 'en';

-- Add comment to describe the column
COMMENT ON COLUMN public.profiles.locale IS 'User preferred language/locale for internationalization';
