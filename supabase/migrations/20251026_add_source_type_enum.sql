-- Migration: Add source_type ENUM
-- Created: 2025-10-26
-- Purpose: Create ENUM type for artifact source types

-- Create ENUM type for source types
DO $$ 
BEGIN
  CREATE TYPE source_type_enum AS ENUM ('api', 'portal', 'pdf', 'link');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Update existing artifacts to set default value if null
UPDATE public.artifacts 
SET source_type = 'pdf' 
WHERE source_type IS NULL;

-- Alter table to use ENUM type
ALTER TABLE public.artifacts 
  ALTER COLUMN source_type TYPE source_type_enum 
  USING source_type::source_type_enum;

-- Add comment
COMMENT ON TYPE source_type_enum IS 'Source types for artifacts: api (from API), portal (from portal), pdf (uploaded PDF), link (external link)';
