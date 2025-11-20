-- =====================================================
-- MIGRACIÓN URGENTE: CORREGIR display_name → name_enc
-- Fecha: 1 de Febrero, 2025
-- =====================================================
-- 
-- PROPÓSITO:
-- Esta migración corrige el problema crítico donde Prisma intenta
-- acceder a profiles.display_name que no existe en la BD.
-- 
-- La BD tiene name_enc (BYTEA) pero Prisma puede estar buscando display_name.
-- Esta migración asegura que display_name se renombre a name_enc si existe,
-- o crea name_enc si no existe.
-- =====================================================

-- =====================================================
-- PARTE 1: VERIFICAR Y RENOMBRAR display_name → name_enc
-- =====================================================

DO $$
BEGIN
    -- CASO 1: display_name existe y name_enc NO existe
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
        -- Verificar tipo de display_name
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'display_name'
              AND data_type = 'text'
        ) THEN
            -- Si es TEXT, renombrar y convertir a BYTEA
            ALTER TABLE public.profiles 
                RENAME COLUMN display_name TO name_enc;
            
            -- Convertir a BYTEA (los datos TEXT se perderán, pero es necesario)
            ALTER TABLE public.profiles 
                ALTER COLUMN name_enc TYPE bytea USING NULL;
            
            RAISE NOTICE '✅ Columna profiles.display_name renombrada a profiles.name_enc y convertida a BYTEA';
        ELSE
            -- Si ya es BYTEA, solo renombrar
            ALTER TABLE public.profiles 
                RENAME COLUMN display_name TO name_enc;
            
            RAISE NOTICE '✅ Columna profiles.display_name renombrada a profiles.name_enc';
        END IF;
    
    -- CASO 2: name_enc ya existe (correcto)
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'name_enc'
    ) THEN
        -- Verificar si también existe display_name (ambas existen)
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'display_name'
        ) THEN
            -- Eliminar display_name si name_enc ya existe
            ALTER TABLE public.profiles 
                DROP COLUMN IF EXISTS display_name;
            
            RAISE NOTICE '✅ Columna profiles.display_name eliminada (name_enc ya existe)';
        ELSE
            RAISE NOTICE 'ℹ️  Columna profiles.name_enc ya existe (correcto)';
        END IF;
    
    -- CASO 3: Ninguna existe, crear name_enc
    ELSE
        ALTER TABLE public.profiles 
            ADD COLUMN IF NOT EXISTS name_enc bytea;
        
        RAISE NOTICE '✅ Columna profiles.name_enc creada (BYTEA)';
    END IF;
END $$;

-- Actualizar comentario de la columna
COMMENT ON COLUMN public.profiles.name_enc IS 'Nombre del usuario encriptado usando pgcrypto (BYTEA). Usar encrypt_pii() para insertar y decrypt_pii() para leer.';

-- =====================================================
-- PARTE 2: VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
    name_enc_exists boolean;
    display_name_exists boolean;
    name_enc_type text;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'name_enc'
    ) INTO name_enc_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'display_name'
    ) INTO display_name_exists;
    
    SELECT data_type INTO name_enc_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'name_enc';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICACIÓN FINAL';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'name_enc existe: %', name_enc_exists;
    RAISE NOTICE 'display_name existe: %', display_name_exists;
    RAISE NOTICE 'name_enc tipo: %', COALESCE(name_enc_type, 'N/A');
    RAISE NOTICE '========================================';
    
    IF NOT name_enc_exists THEN
        RAISE EXCEPTION '❌ ERROR: name_enc no existe después de la migración';
    END IF;
    
    IF display_name_exists THEN
        RAISE WARNING '⚠️  ADVERTENCIA: display_name todavía existe. Se recomienda eliminarla manualmente.';
    END IF;
    
    IF name_enc_type != 'bytea' THEN
        RAISE WARNING '⚠️  ADVERTENCIA: name_enc no es BYTEA (tipo actual: %)', name_enc_type;
    END IF;
END $$;

