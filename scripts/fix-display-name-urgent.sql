-- =====================================================
-- SCRIPT URGENTE: CORREGIR display_name → name_enc
-- Ejecutar directamente en Supabase SQL Editor
-- =====================================================

-- Verificar estado actual
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND (column_name LIKE '%name%' OR column_name LIKE '%display%')
ORDER BY column_name;

-- =====================================================
-- CORRECCIÓN: Renombrar display_name → name_enc
-- =====================================================

DO $$
BEGIN
    -- Si display_name existe y name_enc NO existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'display_name'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'name_enc'
    ) THEN
        -- Renombrar columna
        ALTER TABLE public.profiles 
            RENAME COLUMN display_name TO name_enc;
        
        -- Convertir a BYTEA
        ALTER TABLE public.profiles 
            ALTER COLUMN name_enc TYPE bytea USING NULL;
        
        RAISE NOTICE '✅ display_name renombrado a name_enc y convertido a BYTEA';
    END IF;
    
    -- Si display_name todavía existe (ambas existen), eliminarlo
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'display_name'
    ) AND EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'name_enc'
    ) THEN
        ALTER TABLE public.profiles 
            DROP COLUMN display_name;
        
        RAISE NOTICE '✅ display_name eliminado (name_enc ya existe)';
    END IF;
END $$;

-- Verificar resultado final
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND (column_name LIKE '%name%' OR column_name LIKE '%display%')
ORDER BY column_name;

