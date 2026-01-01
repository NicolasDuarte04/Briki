-- ============================================================================
-- QUICK FIX: Essential Tables for Briki
-- ============================================================================
-- This is a minimal script focusing on the immediately needed tables
-- Run this first to get your app working, then run the full schema later
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create organizations table first (no dependencies)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create org_members table (this is what your error is about)
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);

-- Enable Row Level Security
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for org_members
CREATE POLICY "Users can view their own memberships" ON public.org_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view members in their organizations" ON public.org_members  
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- Create a default organization for testing (optional)
-- INSERT INTO public.organizations (name, slug) 
-- VALUES ('Default Organization', 'default-org')
-- ON CONFLICT (slug) DO NOTHING;

-- Verify the tables were created
SELECT 'org_members table created: ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'org_members'
    ) 
    THEN '✅ SUCCESS' 
    ELSE '❌ FAILED' 
  END as status;

SELECT 'organizations table created: ' || 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'organizations'
    ) 
    THEN '✅ SUCCESS' 
    ELSE '❌ FAILED' 
  END as status;
