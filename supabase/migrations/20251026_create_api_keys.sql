-- Migration: Create api_keys table
-- Created: 2025-10-26
-- Purpose: Enable future API integrations with external systems, automations, and partners
-- Note: Minimal implementation - only table structure and RLS. Logic to be added later.

-- Create api_keys table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  name VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '{}',
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(org_id, name)
);

-- Enable RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS: Only members of the organization can see their API keys
CREATE POLICY "api_keys_org_isolation" ON public.api_keys
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_members.user_id = auth.uid()
      AND org_members.org_id = api_keys.org_id
    )
  );

-- Indexes for performance
CREATE INDEX idx_api_keys_org_id ON public.api_keys(org_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX idx_api_keys_last_used ON public.api_keys(last_used_at);

-- Add comments for documentation
COMMENT ON TABLE public.api_keys IS 'API keys for programmatic access to Briki APIs. Enables future integrations with external systems, automations, and partners.';
COMMENT ON COLUMN public.api_keys.key_hash IS 'Hashed API key (never store plain keys).';
COMMENT ON COLUMN public.api_keys.permissions IS 'JSON object defining what this key can access (cases, clients, etc.).';
COMMENT ON COLUMN public.api_keys.expires_at IS 'When this key expires (NULL = no expiration).';

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_api_keys_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_api_keys_updated_at();
