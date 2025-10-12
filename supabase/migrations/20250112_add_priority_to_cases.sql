-- Migration: Add priority field to cases table
-- Date: 2025-01-12
-- Description: Add priority field to cases table to support case prioritization

-- Add priority column to cases table
ALTER TABLE public.cases 
ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Add index for better query performance
CREATE INDEX idx_cases_priority ON public.cases(priority);

-- Add comment to document the field
COMMENT ON COLUMN public.cases.priority IS 'Priority level of the case: low, medium, high, urgent';
