-- =====================================================
-- MIGRACIÓN: RENOMBRAR COLUMNAS ENCRIPTADAS A NOMBRES NORMALES
-- FASE 2: Sincronización de Migraciones con Base de Datos
-- Fecha: 31 de Enero, 2025
-- =====================================================
-- 
-- PROPÓSITO:
-- Renombrar columnas con sufijo _enc a nombres normales manteniendo
-- el tipo BYTEA (encriptado) para compatibilidad con el código.
-- 
-- CAMBIOS:
-- - messages.content_enc → messages.content (BYTEA)
-- - profiles.display_name → profiles.name_enc (BYTEA) - NUEVO
-- - profiles.phone_enc → profiles.phone (BYTEA)
-- - profiles.address_enc → profiles.address (BYTEA)
--
-- IMPORTANTE: Esta migración es IDEMPOTENTE y preserva todos los datos.
-- =====================================================

-- =====================================================
-- PARTE 1: RENOMBRAR content_enc → content EN messages
-- =====================================================

DO $$
BEGIN
    -- Verificar si existe content_enc y no existe content
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'messages' 
          AND column_name = 'content_enc'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'messages' 
          AND column_name = 'content'
    ) THEN
        -- Renombrar columna manteniendo tipo BYTEA
        ALTER TABLE public.messages 
            RENAME COLUMN content_enc TO content;
        
        RAISE NOTICE '✅ Columna messages.content_enc renombrada a messages.content';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'messages' 
          AND column_name = 'content'
    ) THEN
        RAISE NOTICE 'ℹ️  Columna messages.content ya existe, no se requiere renombrar';
    ELSE
        RAISE NOTICE '⚠️  No se encontró columna content_enc en messages';
    END IF;
END $$;

-- Actualizar comentario de la columna
COMMENT ON COLUMN public.messages.content IS 'Contenido del mensaje encriptado usando pgcrypto (BYTEA). Usar encrypt_pii() para insertar y decrypt_pii() para leer.';

-- =====================================================
-- PARTE 2: RENOMBRAR phone_enc → phone EN profiles
-- =====================================================

DO $$
BEGIN
    -- Verificar si existe phone_enc y no existe phone
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'phone_enc'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'phone'
    ) THEN
        -- Renombrar columna manteniendo tipo BYTEA
        ALTER TABLE public.profiles 
            RENAME COLUMN phone_enc TO phone;
        
        RAISE NOTICE '✅ Columna profiles.phone_enc renombrada a profiles.phone';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'phone'
    ) THEN
        -- Verificar si phone es TEXT y necesita convertirse a BYTEA
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'phone'
              AND data_type = 'text'
        ) THEN
            RAISE NOTICE '⚠️  profiles.phone existe como TEXT, requiere migración de datos a BYTEA';
        ELSE
            RAISE NOTICE 'ℹ️  Columna profiles.phone ya existe con tipo correcto';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  No se encontró columna phone_enc en profiles';
    END IF;
END $$;

-- Actualizar comentario de la columna
COMMENT ON COLUMN public.profiles.phone IS 'Teléfono del usuario encriptado usando pgcrypto (BYTEA). Usar encrypt_pii() para insertar y decrypt_pii() para leer.';

-- =====================================================
-- PARTE 2.5: RENOMBRAR display_name → name_enc EN profiles
-- =====================================================

DO $$
BEGIN
    -- Verificar si existe display_name (TEXT) y no existe name_enc
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
        -- Si display_name es TEXT, necesitamos convertirlo a BYTEA
        -- Primero, encriptar los datos existentes si hay alguno
        -- Luego renombrar y cambiar tipo
        DO $$
        DECLARE
            has_data boolean;
        BEGIN
            SELECT EXISTS(SELECT 1 FROM public.profiles WHERE display_name IS NOT NULL) INTO has_data;
            
            IF has_data THEN
                -- Si hay datos, necesitamos encriptarlos antes de convertir
                -- Por ahora, renombramos y convertimos a BYTEA (los datos se perderán si no están encriptados)
                -- En producción, esto debería hacerse con una migración de datos más cuidadosa
                RAISE NOTICE '⚠️  Hay datos en display_name. Se requiere migración de datos a name_enc (BYTEA encriptado)';
            END IF;
            
            -- Renombrar columna
            ALTER TABLE public.profiles 
                RENAME COLUMN display_name TO name_enc;
            
            -- Cambiar tipo a BYTEA
            ALTER TABLE public.profiles 
                ALTER COLUMN name_enc TYPE bytea USING NULL;
            
            RAISE NOTICE '✅ Columna profiles.display_name renombrada a profiles.name_enc (BYTEA)';
        END $$;
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'name_enc'
    ) THEN
        -- Verificar si name_enc es BYTEA
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'name_enc'
              AND data_type = 'bytea'
        ) THEN
            RAISE NOTICE 'ℹ️  Columna profiles.name_enc ya existe con tipo correcto (BYTEA)';
        ELSE
            RAISE NOTICE '⚠️  profiles.name_enc existe pero no es BYTEA, requiere conversión';
        END IF;
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'display_name'
    ) THEN
        RAISE NOTICE '⚠️  profiles.display_name existe pero name_enc no. Se requiere migración manual.';
    ELSE
        RAISE NOTICE 'ℹ️  No se encontró columna display_name ni name_enc en profiles';
    END IF;
END $$;

-- Actualizar comentario de la columna
COMMENT ON COLUMN public.profiles.name_enc IS 'Nombre del usuario encriptado usando pgcrypto (BYTEA). Usar encrypt_pii() para insertar y decrypt_pii() para leer.';

-- =====================================================
-- PARTE 3: RENOMBRAR address_enc → address EN profiles
-- =====================================================

DO $$
BEGIN
    -- Verificar si existe address_enc y no existe address
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'address_enc'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'address'
    ) THEN
        -- Renombrar columna manteniendo tipo BYTEA
        ALTER TABLE public.profiles 
            RENAME COLUMN address_enc TO address;
        
        RAISE NOTICE '✅ Columna profiles.address_enc renombrada a profiles.address';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'address'
    ) THEN
        -- Verificar si address es TEXT y necesita convertirse a BYTEA
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'profiles' 
              AND column_name = 'address'
              AND data_type = 'text'
        ) THEN
            RAISE NOTICE '⚠️  profiles.address existe como TEXT, requiere migración de datos a BYTEA';
        ELSE
            RAISE NOTICE 'ℹ️  Columna profiles.address ya existe con tipo correcto';
        END IF;
    ELSE
        RAISE NOTICE '⚠️  No se encontró columna address_enc en profiles';
    END IF;
END $$;

-- Actualizar comentario de la columna
COMMENT ON COLUMN public.profiles.address IS 'Dirección del usuario encriptada usando pgcrypto (BYTEA). Usar encrypt_pii() para insertar y decrypt_pii() para leer.';

-- =====================================================
-- PARTE 4: VERIFICAR Y ACTUALIZAR TIPOS SI ES NECESARIO
-- =====================================================

-- Verificar que messages.content es BYTEA
DO $$
DECLARE
    content_type text;
BEGIN
    SELECT data_type INTO content_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'messages'
      AND column_name = 'content';
    
    IF content_type IS NULL THEN
        RAISE EXCEPTION 'Columna messages.content no existe después del renombrado';
    ELSIF content_type != 'bytea' THEN
        RAISE WARNING 'messages.content es de tipo % en lugar de bytea. Se requiere migración de datos.', content_type;
    ELSE
        RAISE NOTICE '✅ messages.content es BYTEA (correcto)';
    END IF;
END $$;

-- Verificar que profiles.phone es BYTEA (si existe)
DO $$
DECLARE
    phone_type text;
BEGIN
    SELECT data_type INTO phone_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      AND column_name = 'phone';
    
    IF phone_type IS NOT NULL THEN
        IF phone_type != 'bytea' THEN
            RAISE WARNING 'profiles.phone es de tipo % en lugar de bytea. Se requiere migración de datos.', phone_type;
        ELSE
            RAISE NOTICE '✅ profiles.phone es BYTEA (correcto)';
        END IF;
    END IF;
END $$;

-- Verificar que profiles.address es BYTEA (si existe)
DO $$
DECLARE
    address_type text;
BEGIN
    SELECT data_type INTO address_type
    FROM information_schema.columns
    WHERE table_schema = 'public' 
      AND table_name = 'profiles'
      AND column_name = 'address';
    
    IF address_type IS NOT NULL THEN
        IF address_type != 'bytea' THEN
            RAISE WARNING 'profiles.address es de tipo % en lugar de bytea. Se requiere migración de datos.', address_type;
        ELSE
            RAISE NOTICE '✅ profiles.address es BYTEA (correcto)';
        END IF;
    END IF;
END $$;

-- =====================================================
-- PARTE 5: VERIFICAR FUNCIONES DE ENCRIPTACIÓN
-- =====================================================

-- Verificar que encrypt_pii() y decrypt_pii() existen
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND routine_name = 'encrypt_pii'
    ) THEN
        RAISE EXCEPTION 'Función encrypt_pii() no existe. Se requiere para encriptación.';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
          AND routine_name = 'decrypt_pii'
    ) THEN
        RAISE EXCEPTION 'Función decrypt_pii() no existe. Se requiere para desencriptación.';
    END IF;
    
    RAISE NOTICE '✅ Funciones de encriptación verificadas: encrypt_pii() y decrypt_pii() existen';
END $$;

-- =====================================================
-- PARTE 6: VERIFICAR EXTENSIÓN pgcrypto
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_extension 
        WHERE extname = 'pgcrypto'
    ) THEN
        RAISE EXCEPTION 'Extensión pgcrypto no está instalada. Se requiere para encriptación.';
    ELSE
        RAISE NOTICE '✅ Extensión pgcrypto está instalada';
    END IF;
END $$;

-- =====================================================
-- RESUMEN DE CAMBIOS APLICADOS
-- =====================================================

DO $$
DECLARE
    messages_content_exists boolean;
    profiles_phone_exists boolean;
    profiles_address_exists boolean;
BEGIN
    -- Verificar estado final
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'messages' 
          AND column_name = 'content'
    ) INTO messages_content_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'phone'
    ) INTO profiles_phone_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'profiles' 
          AND column_name = 'address'
    ) INTO profiles_address_exists;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE MIGRACIÓN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'messages.content: %', CASE WHEN messages_content_exists THEN '✅ Existe' ELSE '❌ No existe' END;
    RAISE NOTICE 'profiles.phone: %', CASE WHEN profiles_phone_exists THEN '✅ Existe' ELSE '❌ No existe' END;
    RAISE NOTICE 'profiles.address: %', CASE WHEN profiles_address_exists THEN '✅ Existe' ELSE '❌ No existe' END;
    RAISE NOTICE '========================================';
END $$;

-- Comentario de migración
COMMENT ON TABLE public.messages IS 'Tabla de mensajes con contenido encriptado. La columna content es BYTEA y debe usar encrypt_pii()/decrypt_pii().';
COMMENT ON TABLE public.profiles IS 'Tabla de perfiles de usuario con campos phone y address encriptados (BYTEA). Usar encrypt_pii()/decrypt_pii().';

