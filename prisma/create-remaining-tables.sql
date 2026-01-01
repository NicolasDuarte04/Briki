-- ============================================================================
-- Create Remaining Essential Tables
-- ============================================================================
-- Run this after the quick-fix script to add more tables your app might need

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name_enc BYTEA,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  locale TEXT DEFAULT 'en',
  phone BYTEA,
  address BYTEA,
  notifications_product_updates BOOLEAN DEFAULT false,
  notifications_policy_alerts BOOLEAN DEFAULT false
);

-- Create cases table
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID,
  client_ref VARCHAR(255),
  client_name VARCHAR(255),
  business_type VARCHAR(255),
  employees INTEGER,
  status VARCHAR(50) DEFAULT 'draft',
  stage VARCHAR(50) DEFAULT 'initial',
  brief_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  priority VARCHAR(20) DEFAULT 'medium',
  budget_currency VARCHAR(3) DEFAULT 'COP',
  client_profile TEXT,
  insurance_category TEXT,
  max_budget DECIMAL(10,2),
  required_coverages TEXT[] DEFAULT '{}'
);

-- Create enum for source_type if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_type_enum') THEN
        CREATE TYPE public.source_type_enum AS ENUM ('api', 'portal', 'pdf', 'link');
    END IF;
END$$;

-- Create artifacts table
CREATE TABLE IF NOT EXISTS public.artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  source_type public.source_type_enum NOT NULL,
  file_id VARCHAR(255),
  file_name VARCHAR(255),
  content_type VARCHAR(100),
  content_text TEXT,
  provenance JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content BYTEA NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indices
CREATE INDEX IF NOT EXISTS messages_case_id_idx ON public.messages(case_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS messages_role_idx ON public.messages(role);

-- Enable RLS on new tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for profiles (IDEMPOTENT)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Check if user exists and create test data
DO $$
DECLARE
    user_id UUID;
    org_id UUID;
BEGIN
    -- Get the current user
    user_id := auth.uid();
    
    IF user_id IS NOT NULL THEN
        -- Check if user has an organization
        SELECT om.org_id INTO org_id 
        FROM public.org_members om 
        WHERE om.user_id = user_id 
        LIMIT 1;
        
        -- If no organization, create one
        IF org_id IS NULL THEN
            INSERT INTO public.organizations (name, slug) 
            VALUES ('Default Organization', 'default-org')
            ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
            RETURNING id INTO org_id;
            
            -- Add user as owner
            INSERT INTO public.org_members (org_id, user_id, role)
            VALUES (org_id, user_id, 'owner')
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Create profile if doesn't exist
        INSERT INTO public.profiles (id, onboarding_completed, locale)
        VALUES (user_id, true, 'es')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Verify tables were created
SELECT 'Tables created successfully!' as status
WHERE EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('profiles', 'cases', 'artifacts', 'messages')
);
