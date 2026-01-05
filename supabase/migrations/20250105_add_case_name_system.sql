-- =====================================================
-- MIGRACIÓN: SISTEMA DE NOMBRES PARA CASES
-- Objetivo: Añadir campos client_id y case_name para nombres descriptivos y editables
-- Fecha: 2025-01-05
-- Autor: FullStack Developer
-- =====================================================

-- =====================================================
-- PASO 1: AÑADIR COLUMNA client_id (SI NO EXISTE)
-- =====================================================

-- Primero añadir client_id con referencia a clients
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS client_id UUID;

-- Añadir FK constraint (si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cases_client_id' 
        AND table_name = 'cases'
    ) THEN
        ALTER TABLE public.cases
        ADD CONSTRAINT fk_cases_client_id 
        FOREIGN KEY (client_id) 
        REFERENCES public.clients(id) 
        ON DELETE SET NULL;
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table clients does not exist, skipping FK constraint';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add FK constraint: %', SQLERRM;
END $$;

-- Comentario de documentación
COMMENT ON COLUMN public.cases.client_id IS 'ID del cliente asociado al caso (FK a public.clients)';

-- =====================================================
-- PASO 2: AÑADIR COLUMNA case_name
-- =====================================================

-- Añadir columna case_name (inicialmente nullable para migración segura)
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS case_name VARCHAR(255);

-- Comentario de documentación
COMMENT ON COLUMN public.cases.case_name IS 'Nombre descriptivo del caso. Formato sugerido: "Caso de [Cliente] #N" o personalizado por el usuario';

-- =====================================================
-- PASO 3: MIGRAR DATOS EXISTENTES
-- =====================================================

-- Usar client_name como base para generar case_name
UPDATE public.cases
SET case_name = COALESCE(
    -- Intentar usar client_name si existe
    CASE 
        WHEN client_name IS NOT NULL AND client_name != '' 
        THEN 'Caso de ' || client_name
        ELSE NULL
    END,
    -- Fallback: Nombre genérico con ID corto
    'Caso #' || SUBSTRING(id::text, 1, 8)
)
WHERE case_name IS NULL;

-- =====================================================
-- PASO 4: HACER case_name NOT NULL
-- =====================================================

-- Asegurar que todos los registros tengan un valor
UPDATE public.cases
SET case_name = 'Caso #' || SUBSTRING(id::text, 1, 8)
WHERE case_name IS NULL OR case_name = '';

-- Ahora es seguro hacer NOT NULL
ALTER TABLE public.cases
ALTER COLUMN case_name SET NOT NULL;

-- Establecer valor por defecto para nuevos registros
ALTER TABLE public.cases
ALTER COLUMN case_name SET DEFAULT 'Nuevo Caso';

-- =====================================================
-- PASO 5: CREAR ÍNDICES
-- =====================================================

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_cases_case_name ON public.cases(case_name);

-- Índice para client_id
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON public.cases(client_id);

-- =====================================================
-- PASO 6: FUNCIONES AUXILIARES
-- =====================================================

-- Función para obtener el siguiente número disponible para un cliente
CREATE OR REPLACE FUNCTION public.get_next_case_number(
    p_client_id UUID,
    p_org_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_next_number INTEGER := 1;
    v_used_numbers INTEGER[];
BEGIN
    -- Si no hay client_id, buscar casos sin cliente
    IF p_client_id IS NULL THEN
        SELECT ARRAY_AGG(
            CASE 
                WHEN case_name ~ '#(\d+)$' 
                THEN (regexp_match(case_name, '#(\d+)$'))[1]::INTEGER
                ELSE NULL
            END
        ) INTO v_used_numbers
        FROM public.cases
        WHERE client_id IS NULL 
          AND org_id = p_org_id
          AND case_name ~ '#(\d+)$';
    ELSE
        -- Obtener números ya usados para este cliente
        SELECT ARRAY_AGG(
            CASE 
                WHEN case_name ~ '#(\d+)$' 
                THEN (regexp_match(case_name, '#(\d+)$'))[1]::INTEGER
                ELSE NULL
            END
        ) INTO v_used_numbers
        FROM public.cases
        WHERE client_id = p_client_id 
          AND org_id = p_org_id
          AND case_name ~ '#(\d+)$';
    END IF;
    
    -- Si no hay números usados, retornar 1
    IF v_used_numbers IS NULL OR array_length(v_used_numbers, 1) IS NULL THEN
        RETURN 1;
    END IF;
    
    -- Encontrar el primer hueco disponible
    WHILE v_next_number = ANY(v_used_numbers) LOOP
        v_next_number := v_next_number + 1;
    END LOOP;
    
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contar casos de un cliente
CREATE OR REPLACE FUNCTION public.count_client_cases(
    p_client_id UUID,
    p_org_id UUID
)
RETURNS INTEGER AS $$
BEGIN
    IF p_client_id IS NULL THEN
        RETURN (
            SELECT COUNT(*)::INTEGER
            FROM public.cases
            WHERE client_id IS NULL 
              AND org_id = p_org_id
        );
    ELSE
        RETURN (
            SELECT COUNT(*)::INTEGER
            FROM public.cases
            WHERE client_id = p_client_id 
              AND org_id = p_org_id
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
