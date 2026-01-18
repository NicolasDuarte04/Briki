-- ============================================================================
-- MIGRACIÓN: Crear tabla case_policy_links
-- Fecha: 2025-01-15
-- Propósito: Permitir vincular pólizas de organización a casos específicos
--            sin duplicar datos (relación N:M)
-- ============================================================================

-- ============================================================================
-- 1. CREAR TABLA PRINCIPAL
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.case_policy_links (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign keys
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    policy_analysis_id UUID NOT NULL REFERENCES public.policy_analyses(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    
    -- Metadata del enlace
    link_type VARCHAR(50) NOT NULL DEFAULT 'reference',  -- 'reference' = enlace sin copia, 'copy' = reservado para futuro
    linked_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    linked_by UUID NOT NULL,  -- user_id que creó el enlace
    notes TEXT,  -- Notas opcionales sobre por qué se vinculó
    
    -- Constraint único: evitar duplicados del mismo enlace
    CONSTRAINT unique_case_policy_link UNIQUE(case_id, policy_analysis_id)
);

-- ============================================================================
-- 2. ÍNDICES PARA OPTIMIZACIÓN DE CONSULTAS
-- ============================================================================

-- Índice para buscar todas las pólizas vinculadas a un caso
CREATE INDEX IF NOT EXISTS idx_case_policy_links_case_id 
    ON public.case_policy_links(case_id);

-- Índice para buscar todos los casos que referencian una póliza
CREATE INDEX IF NOT EXISTS idx_case_policy_links_policy_analysis_id 
    ON public.case_policy_links(policy_analysis_id);

-- Índice para filtrar por organización (RLS y consultas)
CREATE INDEX IF NOT EXISTS idx_case_policy_links_org_id 
    ON public.case_policy_links(org_id);

-- Índice para ordenar por fecha de vinculación
CREATE INDEX IF NOT EXISTS idx_case_policy_links_linked_at 
    ON public.case_policy_links(linked_at DESC);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.case_policy_links ENABLE ROW LEVEL SECURITY;

-- Política SELECT: Usuarios pueden ver enlaces de su organización
CREATE POLICY "Users can view case policy links of their org" 
    ON public.case_policy_links
    FOR SELECT 
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.org_members 
            WHERE org_id = case_policy_links.org_id
        )
    );

-- Política INSERT: Usuarios pueden crear enlaces en su organización
CREATE POLICY "Users can create case policy links in their org" 
    ON public.case_policy_links
    FOR INSERT 
    WITH CHECK (
        auth.uid() IN (
            SELECT user_id FROM public.org_members 
            WHERE org_id = case_policy_links.org_id
        )
    );

-- Política UPDATE: Usuarios pueden actualizar enlaces de su organización (notas, etc.)
CREATE POLICY "Users can update case policy links in their org" 
    ON public.case_policy_links
    FOR UPDATE 
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.org_members 
            WHERE org_id = case_policy_links.org_id
        )
    );

-- Política DELETE: Usuarios pueden eliminar enlaces de su organización
CREATE POLICY "Users can delete case policy links in their org" 
    ON public.case_policy_links
    FOR DELETE 
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.org_members 
            WHERE org_id = case_policy_links.org_id
        )
    );

-- ============================================================================
-- 4. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE public.case_policy_links IS 
    'Enlaces entre casos y pólizas analizadas. Permite vincular pólizas de la organización (almacenadas en el case contenedor) a casos específicos sin duplicar datos.';

COMMENT ON COLUMN public.case_policy_links.id IS 
    'Identificador único del enlace';
    
COMMENT ON COLUMN public.case_policy_links.case_id IS 
    'FK al caso que referencia la póliza';
    
COMMENT ON COLUMN public.case_policy_links.policy_analysis_id IS 
    'FK al análisis de póliza (PolicyAnalysis) que se vincula';
    
COMMENT ON COLUMN public.case_policy_links.org_id IS 
    'ID de la organización para RLS y consultas';
    
COMMENT ON COLUMN public.case_policy_links.link_type IS 
    'Tipo de enlace: "reference" (por defecto) = referencia sin copia';
    
COMMENT ON COLUMN public.case_policy_links.linked_at IS 
    'Timestamp de cuando se creó el enlace';
    
COMMENT ON COLUMN public.case_policy_links.linked_by IS 
    'User ID que creó el enlace';
    
COMMENT ON COLUMN public.case_policy_links.notes IS 
    'Notas opcionales sobre el enlace';

-- ============================================================================
-- 5. VERIFICACIÓN
-- ============================================================================

-- Verificar que la tabla se creó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'case_policy_links'
    ) THEN
        RAISE NOTICE '✅ Tabla case_policy_links creada exitosamente';
    ELSE
        RAISE EXCEPTION '❌ Error: La tabla case_policy_links no se creó';
    END IF;
END $$;

-- Verificar índices
DO $$
DECLARE
    idx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO idx_count
    FROM pg_indexes 
    WHERE tablename = 'case_policy_links';
    
    RAISE NOTICE '✅ Índices creados: %', idx_count;
END $$;

-- Verificar políticas RLS
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'case_policy_links';
    
    RAISE NOTICE '✅ Políticas RLS creadas: %', policy_count;
END $$;

-- ============================================================================
-- FIN DE MIGRACIÓN
-- ============================================================================
