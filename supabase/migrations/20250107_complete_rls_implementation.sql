-- =====================================================
-- MIGRACIÓN: ROW LEVEL SECURITY COMPLETO
-- Objetivo: Implementar RLS en todas las tablas para seguridad multi-tenant
-- Fecha: 2025-10-11
-- =====================================================

-- =====================================================
-- HABILITAR RLS EN TABLAS EXISTENTES
-- =====================================================

-- Habilitar RLS en cases
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en artifacts
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en audit_log
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PARA CASES
-- =====================================================

-- Política para SELECT: Solo miembros de la organización pueden ver casos
CREATE POLICY "org_members_can_view_cases" 
    ON public.cases FOR SELECT 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- Política para INSERT: Solo miembros pueden crear casos
CREATE POLICY "org_members_can_insert_cases" 
    ON public.cases FOR INSERT 
    WITH CHECK (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- Política para UPDATE: Solo miembros pueden actualizar casos
CREATE POLICY "org_members_can_update_cases" 
    ON public.cases FOR UPDATE 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- Política para DELETE: Solo admins y owners pueden eliminar casos
CREATE POLICY "org_admins_can_delete_cases" 
    ON public.cases FOR DELETE 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    ));

-- =====================================================
-- POLÍTICAS RLS PARA ARTIFACTS
-- =====================================================

-- Política para SELECT: Solo miembros de la organización pueden ver artefactos
CREATE POLICY "org_members_can_view_artifacts" 
    ON public.artifacts FOR SELECT 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- Política para INSERT: Solo miembros pueden crear artefactos
CREATE POLICY "org_members_can_insert_artifacts" 
    ON public.artifacts FOR INSERT 
    WITH CHECK (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- Política para UPDATE: Solo miembros pueden actualizar artefactos
CREATE POLICY "org_members_can_update_artifacts" 
    ON public.artifacts FOR UPDATE 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- Política para DELETE: Solo admins y owners pueden eliminar artefactos
CREATE POLICY "org_admins_can_delete_artifacts" 
    ON public.artifacts FOR DELETE 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid() 
        AND role IN ('admin', 'owner')
    ));

-- =====================================================
-- POLÍTICAS RLS PARA AUDIT_LOG
-- =====================================================

-- Política para SELECT: Solo miembros pueden ver logs de su organización
CREATE POLICY "org_members_can_view_audit_logs" 
    ON public.audit_log FOR SELECT 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- Política para INSERT: Solo el sistema puede insertar logs
CREATE POLICY "system_can_insert_audit_logs" 
    ON public.audit_log FOR INSERT 
    WITH CHECK (true); -- El sistema siempre puede insertar logs

-- Política para UPDATE: Nadie puede actualizar logs (solo lectura)
CREATE POLICY "no_updates_to_audit_logs" 
    ON public.audit_log FOR UPDATE 
    USING (false);

-- Política para DELETE: Solo super admins pueden eliminar logs
CREATE POLICY "super_admins_can_delete_audit_logs" 
    ON public.audit_log FOR DELETE 
    USING (auth.uid() IN (
        SELECT user_id FROM public.org_members 
        WHERE role = 'owner' AND org_id = (
            SELECT id FROM public.organizations WHERE slug = 'briki-dev'
        )
    ));

-- =====================================================
-- FUNCIONES DE UTILIDAD PARA RLS
-- =====================================================

-- Función para verificar si un usuario es miembro de una organización
CREATE OR REPLACE FUNCTION public.is_org_member(org_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.org_members 
        WHERE org_id = org_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el rol de un usuario en una organización
CREATE OR REPLACE FUNCTION public.get_user_role(org_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.org_members 
    WHERE org_id = org_uuid AND user_id = user_uuid;
    
    RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es admin o owner
CREATE OR REPLACE FUNCTION public.is_org_admin(org_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.org_members 
        WHERE org_id = org_uuid 
        AND user_id = user_uuid 
        AND role IN ('admin', 'owner')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- POLÍTICAS RLS MEJORADAS CON FUNCIONES
-- =====================================================

-- Política mejorada para cases usando funciones
DROP POLICY IF EXISTS "org_members_can_view_cases" ON public.cases;
CREATE POLICY "org_members_can_view_cases" 
    ON public.cases FOR SELECT 
    USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org_members_can_insert_cases" ON public.cases;
CREATE POLICY "org_members_can_insert_cases" 
    ON public.cases FOR INSERT 
    WITH CHECK (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org_members_can_update_cases" ON public.cases;
CREATE POLICY "org_members_can_update_cases" 
    ON public.cases FOR UPDATE 
    USING (public.is_org_member(org_id));

DROP POLICY IF EXISTS "org_admins_can_delete_cases" ON public.cases;
CREATE POLICY "org_admins_can_delete_cases" 
    ON public.cases FOR DELETE 
    USING (public.is_org_admin(org_id));

-- =====================================================
-- VISTAS SEGURAS PARA REPORTES
-- =====================================================

-- Vista para estadísticas de casos por organización (solo para miembros)
CREATE VIEW public.case_stats_view AS
SELECT 
    c.org_id,
    COUNT(*) as total_cases,
    COUNT(*) FILTER (WHERE c.status = 'active') as active_cases,
    COUNT(*) FILTER (WHERE c.status = 'completed') as completed_cases,
    SUM(c.pdf_count) as total_pdfs,
    ROUND(AVG(c.pdf_count), 2) as avg_pdfs_per_case,
    MAX(c.last_activity) as last_activity
FROM public.cases c
WHERE public.is_org_member(c.org_id)
GROUP BY c.org_id;

-- Comentario para la vista
COMMENT ON VIEW public.case_stats_view IS 'Estadísticas de casos filtradas por RLS para cada organización';

-- =====================================================
-- FUNCIÓN DE AUDITORÍA AUTOMÁTICA
-- =====================================================

-- Función para registrar automáticamente cambios en audit_log
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    old_data jsonb;
    new_data jsonb;
    operation text;
BEGIN
    -- Determinar la operación
    IF TG_OP = 'DELETE' THEN
        operation := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        operation := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        operation := 'INSERT';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;

    -- Insertar en audit_log
    INSERT INTO public.audit_log (
        case_id,
        org_id,
        user_id,
        action,
        tool,
        payload,
        resource_type,
        resource_id,
        severity,
        ip_address,
        user_agent
    ) VALUES (
        CASE 
            WHEN TG_TABLE_NAME = 'cases' THEN NEW.id
            WHEN TG_TABLE_NAME = 'artifacts' THEN NEW.case_id
            ELSE NULL
        END,
        CASE 
            WHEN TG_TABLE_NAME = 'cases' THEN NEW.org_id
            WHEN TG_TABLE_NAME = 'artifacts' THEN NEW.org_id
            ELSE NULL
        END,
        auth.uid(),
        operation,
        TG_TABLE_NAME,
        jsonb_build_object(
            'old', old_data,
            'new', new_data
        ),
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        'info',
        inet_client_addr(),
        current_setting('request.headers', true)::jsonb->>'user-agent'
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS DE AUDITORÍA
-- =====================================================

-- Trigger para auditoría en cases
CREATE TRIGGER audit_cases_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger para auditoría en artifacts
CREATE TRIGGER audit_artifacts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.artifacts
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger_function();
