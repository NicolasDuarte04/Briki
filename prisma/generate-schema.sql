-- ============================================================================
-- BRIKI DATABASE SCHEMA - Generated from Prisma Schema
-- ============================================================================
-- This script creates all necessary tables, indices, and constraints
-- Run this directly in Supabase SQL Editor to bypass Prisma connection issues
-- Generated on: 2025-11-20
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PART 1: AUTH SCHEMA TABLES (Managed by Supabase Auth)
-- ============================================================================
-- Note: These tables are typically managed by Supabase Auth
-- Only create if they don't exist (for completeness)

-- ============================================================================
-- PART 2: PUBLIC SCHEMA TABLES
-- ============================================================================

-- Drop existing enums if they exist (to avoid conflicts)
DROP TYPE IF EXISTS public.source_type_enum CASCADE;

-- Create enums
CREATE TYPE public.source_type_enum AS ENUM ('api', 'portal', 'pdf', 'link');

-- ============================================================================
-- TABLE: organizations (foundation table, no dependencies)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);

-- ============================================================================
-- TABLE: org_members (depends on organizations and auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.org_members(role);

-- Add check constraint
ALTER TABLE public.org_members DROP CONSTRAINT IF EXISTS org_members_role_check;
ALTER TABLE public.org_members ADD CONSTRAINT org_members_role_check 
  CHECK (role IN ('owner', 'admin', 'member'));

-- ============================================================================
-- TABLE: profiles (depends on auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name_enc BYTEA,  -- Encrypted name using pgcrypto
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  locale TEXT DEFAULT 'en',
  phone BYTEA,     -- Encrypted phone
  address BYTEA,   -- Encrypted address
  notifications_product_updates BOOLEAN DEFAULT false,
  notifications_policy_alerts BOOLEAN DEFAULT false
);

-- ============================================================================
-- TABLE: clients (depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name_enc BYTEA NOT NULL,  -- Encrypted name
  email_enc BYTEA,          -- Encrypted email
  phone_enc BYTEA,          -- Encrypted phone
  address_enc BYTEA,        -- Encrypted address
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at DESC);

-- ============================================================================
-- TABLE: api_keys (depends on organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_hash BYTEA NOT NULL,
  name VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, name)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON public.api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_last_used ON public.api_keys(last_used_at);

-- ============================================================================
-- TABLE: cases
-- ============================================================================
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

-- ============================================================================
-- TABLE: artifacts (depends on cases)
-- ============================================================================
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

-- ============================================================================
-- TABLE: audit_log (depends on cases - but case_id is optional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  actor VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  tool VARCHAR(50),
  payload_hash VARCHAR(64),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: messages (depends on cases)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content BYTEA NOT NULL,  -- Encrypted content
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS messages_case_id_idx ON public.messages(case_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS messages_role_idx ON public.messages(role);

-- ============================================================================
-- TABLE: policy_analyses (depends on artifacts, cases, organizations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.policy_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  extracted_data JSONB NOT NULL,
  extraction_method TEXT NOT NULL DEFAULT 'hybrid' CHECK (extraction_method IN ('manual', 'ocr', 'hybrid')),
  overall_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  extracted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_analyses_artifact_id ON public.policy_analyses(artifact_id);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_case_id ON public.policy_analyses(case_id);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_org_id ON public.policy_analyses(org_id);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_extracted_at ON public.policy_analyses(extracted_at DESC);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_confidence ON public.policy_analyses(overall_confidence);

-- ============================================================================
-- TABLE: policy_page_references (depends on policy_analyses)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.policy_page_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_analysis_id UUID NOT NULL REFERENCES public.policy_analyses(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_value TEXT,
  page_number INTEGER NOT NULL CHECK (page_number > 0),
  bounding_box JSONB,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.00 CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_page_refs_analysis_id ON public.policy_page_references(policy_analysis_id);
CREATE INDEX IF NOT EXISTS idx_policy_page_refs_field_name ON public.policy_page_references(field_name);
CREATE INDEX IF NOT EXISTS idx_policy_page_refs_page_number ON public.policy_page_references(page_number);
CREATE INDEX IF NOT EXISTS idx_policy_page_refs_confidence ON public.policy_page_references(confidence);

-- ============================================================================
-- LEGACY TABLES (For NextAuth compatibility - may not be needed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public."Account" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at INTEGER,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  UNIQUE(provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS public."User" (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  "emailVerified" TIMESTAMP,
  image TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."Profile" (
  id TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  name TEXT,
  locale TEXT DEFAULT 'en',
  "onboardingCompleted" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."Session" (
  id TEXT PRIMARY KEY,
  "sessionToken" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  expires TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public."VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires TIMESTAMP NOT NULL,
  UNIQUE(identifier, token)
);

-- Add foreign key for Account table
ALTER TABLE public."Account" 
  DROP CONSTRAINT IF EXISTS "Account_userId_fkey",
  ADD CONSTRAINT "Account_userId_fkey" 
  FOREIGN KEY ("userId") REFERENCES public."User"(id) ON DELETE CASCADE;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables that need it
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_page_references ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (you may need to adjust these based on your needs)
-- Example for org_members table:
CREATE POLICY "Users can view their org memberships" ON public.org_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view members in their orgs" ON public.org_members
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM public.org_members WHERE user_id = auth.uid()
    )
  );

-- Add more RLS policies as needed based on your security requirements

-- ============================================================================
-- FINAL NOTES
-- ============================================================================
-- 1. Run this script in Supabase SQL Editor
-- 2. After running, execute: SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- 3. You should see all the tables created
-- 4. Then you can try running your Next.js app again
