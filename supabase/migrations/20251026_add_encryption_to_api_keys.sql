-- Migration: Add encryption support for api_keys
-- Created: 2025-10-26
-- Purpose: Encrypt API keys following the same security pattern as PII data (clients)

-- Change key_hash column from TEXT to BYTEA to support encryption
ALTER TABLE public.api_keys 
  ALTER COLUMN key_hash TYPE BYTEA USING key_hash::bytea;

-- Update comment to clarify encryption requirement
COMMENT ON COLUMN public.api_keys.key_hash IS 'Encrypted API key using pgcrypto (never store plain keys). Use encrypt_pii() function.';

-- Add helper function to encrypt API keys
CREATE OR REPLACE FUNCTION public.encrypt_api_key(plain_key text)
RETURNS bytea AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from session variable
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured. Please set app.encryption_key session variable.';
  END IF;
  
  -- Encrypt using pgcrypto
  RETURN pgp_sym_encrypt(plain_key, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add helper function to decrypt API keys
CREATE OR REPLACE FUNCTION public.decrypt_api_key(encrypted_key bytea)
RETURNS text AS $$
DECLARE
  encryption_key text;
BEGIN
  -- Get encryption key from session variable
  encryption_key := current_setting('app.encryption_key', true);
  
  IF encryption_key IS NULL OR encryption_key = '' THEN
    RAISE EXCEPTION 'Encryption key not configured. Please set app.encryption_key session variable.';
  END IF;
  
  -- Decrypt using pgcrypto
  RETURN pgp_sym_decrypt(encrypted_key, encryption_key);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION public.encrypt_api_key(text) IS 'Encrypt API key using pgcrypto. Returns encrypted bytea.';
COMMENT ON FUNCTION public.decrypt_api_key(bytea) IS 'Decrypt API key using pgcrypto. Returns decrypted text.';
