-- ============================================================================
-- MIGRACIÓN: Case Virtual para Pólizas Standalone
-- Fecha: 2026-01-07
-- Descripción: Crea la infraestructura para almacenar pólizas descontextualizadas
--              de casos, usando un "case contenedor" especial por organización.
-- ============================================================================

-- ============================================================================
-- PARTE 1: Constantes especiales para identificar el case virtual
-- ============================================================================

-- El case virtual usa estos valores especiales que NUNCA deben usarse en cases normales:
-- status = '__org_policies_container__'
-- stage = '__system__'
-- case_name = '__ORG_POLICIES_CONTAINER__'
-- client_name = NULL

-- ============================================================================
-- PARTE 2: Función helper para obtener o crear el case contenedor de pólizas
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_or_create_org_policies_container(p_org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_case_id UUID;
BEGIN
    -- Buscar el case contenedor existente para esta organización
    SELECT id INTO v_case_id
    FROM public.cases
    WHERE org_id = p_org_id
      AND status = '__org_policies_container__'
      AND stage = '__system__'
    LIMIT 1;
    
    -- Si no existe, crearlo
    IF v_case_id IS NULL THEN
        INSERT INTO public.cases (
            org_id,
            case_name,
            client_name,
            status,
            stage,
            priority,
            brief_data,
            created_at,
            updated_at
        ) VALUES (
            p_org_id,
            '__ORG_POLICIES_CONTAINER__',
            NULL,
            '__org_policies_container__',
            '__system__',
            'low',
            '{"isSystemContainer": true, "purpose": "org_policies"}'::jsonb,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_case_id;
        
        -- Log de creación
        RAISE NOTICE 'Created org policies container % for org %', v_case_id, p_org_id;
    END IF;
    
    RETURN v_case_id;
END;
$$;

-- Comentario de la función
COMMENT ON FUNCTION public.get_or_create_org_policies_container(UUID) IS 
'Obtiene o crea el case contenedor especial para pólizas standalone de una organización.
Este case NUNCA debe aparecer en listas de casos normales ni como chat histórico.';

-- ============================================================================
-- PARTE 3: Función helper para verificar si un case es contenedor de pólizas
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_org_policies_container(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.cases
        WHERE id = p_case_id
          AND status = '__org_policies_container__'
          AND stage = '__system__'
    );
END;
$$;

COMMENT ON FUNCTION public.is_org_policies_container(UUID) IS 
'Verifica si un case es el contenedor especial de pólizas de organización.
Usar para filtrar este case de listas normales.';

-- ============================================================================
-- PARTE 4: Vista para obtener cases normales (excluyendo contenedores)
-- ============================================================================

-- Esta vista facilita las consultas que necesitan excluir el case contenedor
CREATE OR REPLACE VIEW public.regular_cases AS
SELECT *
FROM public.cases
WHERE status != '__org_policies_container__'
  AND stage != '__system__';

COMMENT ON VIEW public.regular_cases IS 
'Vista que excluye automáticamente los cases contenedores de pólizas.
Usar esta vista en lugar de la tabla cases directamente para listas de casos.';

-- ============================================================================
-- PARTE 5: Índice para búsqueda rápida del contenedor
-- ============================================================================

-- Índice parcial para encontrar rápidamente el contenedor de una org
CREATE INDEX IF NOT EXISTS idx_cases_org_policies_container 
ON public.cases (org_id) 
WHERE status = '__org_policies_container__' AND stage = '__system__';

-- ============================================================================
-- PARTE 6: Constraint para evitar duplicados de contenedor por org
-- ============================================================================

-- Asegurar que solo hay un contenedor por organización
-- Usamos un índice único parcial en lugar de constraint porque es más flexible
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_org_policies_container
ON public.cases (org_id)
WHERE status = '__org_policies_container__' AND stage = '__system__';

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

DO $$
BEGIN
    -- Verificar que la función existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_or_create_org_policies_container'
    ) THEN
        RAISE EXCEPTION 'Function get_or_create_org_policies_container was not created';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'is_org_policies_container'
    ) THEN
        RAISE EXCEPTION 'Function is_org_policies_container was not created';
    END IF;
    
    RAISE NOTICE '✅ Migración completada: Case Virtual para Pólizas configurado correctamente';
END $$;
