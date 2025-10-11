-- =====================================================
-- MIGRACIÓN: MEJORAS A TABLAS EXISTENTES
-- Objetivo: Optimizar cases, artifacts y audit_log para el módulo PDF
-- Fecha: 2025-10-11
-- =====================================================

-- =====================================================
-- MEJORAS A TABLA CASES
-- =====================================================

-- Agregar campos faltantes para multi-tenancy y funcionalidad PDF
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id),
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS due_date timestamptz,
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS pdf_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity timestamptz DEFAULT now();

-- Comentarios para documentación
COMMENT ON COLUMN public.cases.org_id IS 'ID de la organización propietaria del caso';
COMMENT ON COLUMN public.cases.client_id IS 'ID del cliente asociado al caso';
COMMENT ON COLUMN public.cases.priority IS 'Prioridad del caso: low, medium, high, urgent';
COMMENT ON COLUMN public.cases.due_date IS 'Fecha límite para completar el caso';
COMMENT ON COLUMN public.cases.tags IS 'Etiquetas para categorización del caso';
COMMENT ON COLUMN public.cases.pdf_count IS 'Número de PDFs procesados en este caso';
COMMENT ON COLUMN public.cases.last_activity IS 'Última actividad registrada en el caso';

-- =====================================================
-- MEJORAS A TABLA ARTIFACTS
-- =====================================================

-- Agregar campos para procesamiento de PDFs
ALTER TABLE public.artifacts
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS file_size bigint,
ADD COLUMN IF NOT EXISTS file_hash text, -- Para deduplicación
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS extracted_data jsonb, -- Datos extraídos del PDF
ADD COLUMN IF NOT EXISTS confidence_score decimal(3,2) CHECK (confidence_score >= 0.00 AND confidence_score <= 1.00),
ADD COLUMN IF NOT EXISTS page_count integer,
ADD COLUMN IF NOT EXISTS document_type text, -- 'policy', 'proposal', 'endorsement', 'comparison'
ADD COLUMN IF NOT EXISTS processing_error text,
ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Comentarios para documentación
COMMENT ON COLUMN public.artifacts.org_id IS 'ID de la organización propietaria del artefacto';
COMMENT ON COLUMN public.artifacts.file_size IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN public.artifacts.file_hash IS 'Hash SHA256 para deduplicación de archivos';
COMMENT ON COLUMN public.artifacts.processing_status IS 'Estado del procesamiento: pending, processing, completed, failed';
COMMENT ON COLUMN public.artifacts.extracted_data IS 'Datos estructurados extraídos del PDF';
COMMENT ON COLUMN public.artifacts.confidence_score IS 'Puntuación de confianza de la extracción (0.00-1.00)';
COMMENT ON COLUMN public.artifacts.page_count IS 'Número de páginas del documento';
COMMENT ON COLUMN public.artifacts.document_type IS 'Tipo de documento: policy, proposal, endorsement, comparison';
COMMENT ON COLUMN public.artifacts.processing_error IS 'Mensaje de error si el procesamiento falla';
COMMENT ON COLUMN public.artifacts.processed_at IS 'Timestamp cuando se completó el procesamiento';

-- =====================================================
-- MEJORAS A TABLA AUDIT_LOG
-- =====================================================

-- Agregar campos para trazabilidad completa
ALTER TABLE public.audit_log
ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS ip_address inet,
ADD COLUMN IF NOT EXISTS user_agent text,
ADD COLUMN IF NOT EXISTS session_id uuid,
ADD COLUMN IF NOT EXISTS resource_type text, -- 'case', 'artifact', 'client', 'organization'
ADD COLUMN IF NOT EXISTS resource_id uuid,
ADD COLUMN IF NOT EXISTS severity text DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical'));

-- Comentarios para documentación
COMMENT ON COLUMN public.audit_log.org_id IS 'ID de la organización donde ocurrió la acción';
COMMENT ON COLUMN public.audit_log.user_id IS 'ID del usuario que realizó la acción';
COMMENT ON COLUMN public.audit_log.ip_address IS 'Dirección IP del usuario';
COMMENT ON COLUMN public.audit_log.user_agent IS 'User agent del navegador';
COMMENT ON COLUMN public.audit_log.session_id IS 'ID de la sesión del usuario';
COMMENT ON COLUMN public.audit_log.resource_type IS 'Tipo de recurso afectado: case, artifact, client, organization';
COMMENT ON COLUMN public.audit_log.resource_id IS 'ID del recurso específico afectado';
COMMENT ON COLUMN public.audit_log.severity IS 'Severidad del evento: debug, info, warning, error, critical';

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

-- Índices para cases
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_org_id ON public.cases(org_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_status_stage ON public.cases(status, stage);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_created_at ON public.cases(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_priority ON public.cases(priority);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_due_date ON public.cases(due_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cases_last_activity ON public.cases(last_activity DESC);

-- Índices para artifacts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artifacts_org_id ON public.artifacts(org_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artifacts_case_id ON public.artifacts(case_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artifacts_processing_status ON public.artifacts(processing_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artifacts_file_hash ON public.artifacts(file_hash);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artifacts_document_type ON public.artifacts(document_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_artifacts_created_at ON public.artifacts(created_at DESC);

-- Índices para audit_log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_org_id ON public.audit_log(org_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_resource ON public.audit_log(resource_type, resource_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_severity ON public.audit_log(severity);

-- =====================================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- =====================================================

-- Trigger para actualizar last_activity en cases cuando se modifica
CREATE OR REPLACE FUNCTION public.update_case_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_case_last_activity_trigger
    BEFORE UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_case_last_activity();

-- Trigger para actualizar pdf_count en cases cuando se agrega/elimina artifact
CREATE OR REPLACE FUNCTION public.update_case_pdf_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.cases 
        SET pdf_count = pdf_count + 1 
        WHERE id = NEW.case_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.cases 
        SET pdf_count = pdf_count - 1 
        WHERE id = OLD.case_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_case_pdf_count_trigger
    AFTER INSERT OR DELETE ON public.artifacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_case_pdf_count();

-- =====================================================
-- FUNCIONES DE UTILIDAD
-- =====================================================

-- Función para obtener estadísticas de casos por organización
CREATE OR REPLACE FUNCTION public.get_case_stats(org_uuid uuid)
RETURNS jsonb AS $$
DECLARE
    stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_cases', COUNT(*),
        'active_cases', COUNT(*) FILTER (WHERE status = 'active'),
        'completed_cases', COUNT(*) FILTER (WHERE status = 'completed'),
        'total_pdfs', SUM(pdf_count),
        'avg_pdfs_per_case', ROUND(AVG(pdf_count), 2)
    ) INTO stats
    FROM public.cases
    WHERE org_id = org_uuid;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas de artefactos por organización
CREATE OR REPLACE FUNCTION public.get_artifact_stats(org_uuid uuid)
RETURNS jsonb AS $$
DECLARE
    stats jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_artifacts', COUNT(*),
        'pending_processing', COUNT(*) FILTER (WHERE processing_status = 'pending'),
        'processing', COUNT(*) FILTER (WHERE processing_status = 'processing'),
        'completed', COUNT(*) FILTER (WHERE processing_status = 'completed'),
        'failed', COUNT(*) FILTER (WHERE processing_status = 'failed'),
        'avg_confidence', ROUND(AVG(confidence_score), 2),
        'total_pages', SUM(page_count)
    ) INTO stats
    FROM public.artifacts
    WHERE org_id = org_uuid;
    
    RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
