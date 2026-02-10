-- ============================================================================
-- MIGRACIÓN: Creación de tablas para Cotizaciones (Quotes)
-- Fecha: 2026-02-09
-- Autor: Sistema Briki
-- Descripción: Implementa sistema de gestión de cotizaciones análogo a pólizas
-- ============================================================================

-- ============================================================================
-- 1. TABLA: quote_analyses
-- Almacena datos estructurados extraídos de PDFs de cotizaciones
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quote_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    extracted_data JSONB NOT NULL,
    extraction_method VARCHAR(50) NOT NULL DEFAULT 'hybrid',
    overall_confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    extracted_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para quote_analyses
CREATE INDEX IF NOT EXISTS idx_quote_analyses_artifact_id ON public.quote_analyses(artifact_id);
CREATE INDEX IF NOT EXISTS idx_quote_analyses_case_id ON public.quote_analyses(case_id);
CREATE INDEX IF NOT EXISTS idx_quote_analyses_org_id ON public.quote_analyses(org_id);
CREATE INDEX IF NOT EXISTS idx_quote_analyses_extracted_at ON public.quote_analyses(extracted_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_analyses_overall_confidence ON public.quote_analyses(overall_confidence);

-- Comentario de tabla
COMMENT ON TABLE public.quote_analyses IS 'Análisis estructurado de cotizaciones de seguros extraídas de PDFs';

-- ============================================================================
-- 2. TABLA: quote_page_references
-- Mapea campos extraídos a ubicaciones exactas en el PDF fuente
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.quote_page_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_analysis_id UUID NOT NULL REFERENCES public.quote_analyses(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    page_number INT NOT NULL,
    bounding_box JSONB,
    confidence DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para quote_page_references
CREATE INDEX IF NOT EXISTS idx_quote_page_references_quote_analysis_id ON public.quote_page_references(quote_analysis_id);
CREATE INDEX IF NOT EXISTS idx_quote_page_references_field_name ON public.quote_page_references(field_name);
CREATE INDEX IF NOT EXISTS idx_quote_page_references_page_number ON public.quote_page_references(page_number);
CREATE INDEX IF NOT EXISTS idx_quote_page_references_confidence ON public.quote_page_references(confidence);

-- Comentario de tabla
COMMENT ON TABLE public.quote_page_references IS 'Referencias de campos extraídos a páginas específicas del PDF de cotización';

-- ============================================================================
-- 3. TABLA: case_quote_links
-- Tabla pivote N:M para vincular cotizaciones a casos
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.case_quote_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    quote_analysis_id UUID NOT NULL REFERENCES public.quote_analyses(id) ON DELETE CASCADE,
    org_id UUID NOT NULL,
    link_type VARCHAR(50) NOT NULL DEFAULT 'reference',
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    linked_by UUID NOT NULL,
    notes TEXT,
    contextualized_at TIMESTAMPTZ,
    
    -- Restricción única para evitar duplicados
    CONSTRAINT unique_case_quote_link UNIQUE (case_id, quote_analysis_id)
);

-- Índices para case_quote_links
CREATE INDEX IF NOT EXISTS idx_case_quote_links_case_id ON public.case_quote_links(case_id);
CREATE INDEX IF NOT EXISTS idx_case_quote_links_quote_analysis_id ON public.case_quote_links(quote_analysis_id);
CREATE INDEX IF NOT EXISTS idx_case_quote_links_org_id ON public.case_quote_links(org_id);
CREATE INDEX IF NOT EXISTS idx_case_quote_links_linked_at ON public.case_quote_links(linked_at DESC);

-- Comentario de tabla
COMMENT ON TABLE public.case_quote_links IS 'Enlaces N:M entre casos y cotizaciones de la organización';

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) - CRÍTICO PARA MULTITENANCY
-- ============================================================================

-- Habilitar RLS en todas las tablas nuevas
ALTER TABLE public.quote_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_page_references ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_quote_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4.1 Políticas RLS para quote_analyses
-- ============================================================================

-- SELECT: Usuarios pueden ver cotizaciones de su organización
CREATE POLICY "Users can view quotes from their org"
ON public.quote_analyses
FOR SELECT
USING (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
);

-- INSERT: Usuarios pueden crear cotizaciones en su organización
CREATE POLICY "Users can create quotes in their org"
ON public.quote_analyses
FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
);

-- UPDATE: Usuarios pueden actualizar cotizaciones de su organización
CREATE POLICY "Users can update quotes in their org"
ON public.quote_analyses
FOR UPDATE
USING (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
)
WITH CHECK (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
);

-- DELETE: Usuarios pueden eliminar cotizaciones de su organización
CREATE POLICY "Users can delete quotes from their org"
ON public.quote_analyses
FOR DELETE
USING (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- 4.2 Políticas RLS para quote_page_references
-- ============================================================================

-- SELECT: Acceso basado en la cotización padre
CREATE POLICY "Users can view quote references from their org"
ON public.quote_page_references
FOR SELECT
USING (
    quote_analysis_id IN (
        SELECT qa.id 
        FROM public.quote_analyses qa 
        WHERE qa.org_id IN (
            SELECT om.org_id 
            FROM public.org_members om 
            WHERE om.user_id = (SELECT auth.uid())
        )
    )
);

-- INSERT: Basado en cotización padre
CREATE POLICY "Users can create quote references in their org"
ON public.quote_page_references
FOR INSERT
WITH CHECK (
    quote_analysis_id IN (
        SELECT qa.id 
        FROM public.quote_analyses qa 
        WHERE qa.org_id IN (
            SELECT om.org_id 
            FROM public.org_members om 
            WHERE om.user_id = (SELECT auth.uid())
        )
    )
);

-- UPDATE: Basado en cotización padre
CREATE POLICY "Users can update quote references in their org"
ON public.quote_page_references
FOR UPDATE
USING (
    quote_analysis_id IN (
        SELECT qa.id 
        FROM public.quote_analyses qa 
        WHERE qa.org_id IN (
            SELECT om.org_id 
            FROM public.org_members om 
            WHERE om.user_id = (SELECT auth.uid())
        )
    )
);

-- DELETE: Basado en cotización padre
CREATE POLICY "Users can delete quote references from their org"
ON public.quote_page_references
FOR DELETE
USING (
    quote_analysis_id IN (
        SELECT qa.id 
        FROM public.quote_analyses qa 
        WHERE qa.org_id IN (
            SELECT om.org_id 
            FROM public.org_members om 
            WHERE om.user_id = (SELECT auth.uid())
        )
    )
);

-- ============================================================================
-- 4.3 Políticas RLS para case_quote_links
-- ============================================================================

-- SELECT: Usuarios pueden ver enlaces de su organización
CREATE POLICY "Users can view quote links from their org"
ON public.case_quote_links
FOR SELECT
USING (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
);

-- INSERT: Usuarios pueden crear enlaces en su organización
CREATE POLICY "Users can create quote links in their org"
ON public.case_quote_links
FOR INSERT
WITH CHECK (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
);

-- UPDATE: Usuarios pueden actualizar enlaces de su organización
CREATE POLICY "Users can update quote links in their org"
ON public.case_quote_links
FOR UPDATE
USING (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
);

-- DELETE: Usuarios pueden eliminar enlaces de su organización
CREATE POLICY "Users can delete quote links from their org"
ON public.case_quote_links
FOR DELETE
USING (
    org_id IN (
        SELECT om.org_id 
        FROM public.org_members om 
        WHERE om.user_id = (SELECT auth.uid())
    )
);

-- ============================================================================
-- 5. TRIGGER: Actualización automática de updated_at
-- ============================================================================

-- Función de trigger (reutiliza si ya existe)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para quote_analyses
DROP TRIGGER IF EXISTS update_quote_analyses_updated_at ON public.quote_analyses;
CREATE TRIGGER update_quote_analyses_updated_at
    BEFORE UPDATE ON public.quote_analyses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. GRANTS: Permisos para roles de Supabase
-- ============================================================================

-- Permisos para authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_analyses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_page_references TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_quote_links TO authenticated;

-- Permisos para service role (bypasses RLS)
GRANT ALL ON public.quote_analyses TO service_role;
GRANT ALL ON public.quote_page_references TO service_role;
GRANT ALL ON public.case_quote_links TO service_role;

-- ============================================================================
-- 7. VERIFICACIÓN FINAL
-- ============================================================================

DO $$
BEGIN
    -- Verificar que las tablas fueron creadas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_analyses' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Tabla quote_analyses creada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: Tabla quote_analyses no fue creada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_page_references' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Tabla quote_page_references creada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: Tabla quote_page_references no fue creada';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'case_quote_links' AND table_schema = 'public') THEN
        RAISE NOTICE '✅ Tabla case_quote_links creada correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: Tabla case_quote_links no fue creada';
    END IF;
    
    -- Verificar RLS habilitado
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'quote_analyses' AND rowsecurity = true) THEN
        RAISE NOTICE '✅ RLS habilitado en quote_analyses';
    END IF;
    
    RAISE NOTICE '🎉 Migración de tablas de cotizaciones completada exitosamente';
END;
$$;
