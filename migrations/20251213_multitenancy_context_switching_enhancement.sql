-- ============================================================================
-- MIGRACIÓN: MULTI-TENANCY CONTEXT SWITCHING ENHANCEMENT
-- ============================================================================
-- Fecha: 2025-12-13
-- Objetivo: Implementar infraestructura de selección dinámica de organización
-- Prioridad: ALTA
-- Tipo: NON-DESTRUCTIVE (No elimina datos ni rompe funcionalidades)
-- ============================================================================
--
-- RESUMEN DE CAMBIOS:
-- 1. Función get_current_org_id() - Obtiene el org_id del contexto de sesión
-- 2. Tabla user_preferences - Almacena preferencias por usuario incluyendo org activa
-- 3. Función set_org_context() - Establece el contexto de organización para la sesión
-- 4. Función get_user_organizations() - Lista organizaciones de un usuario con roles
-- 5. Función switch_organization() - Cambia y persiste la organización activa
-- 6. Tabla renewals - Nueva tabla para tracking de renovaciones (faltante)
-- 7. Tabla renewal_history - Historial de renovaciones
-- 8. Tabla renewal_alerts - Alertas de renovaciones
-- 9. RLS Policies para todas las tablas nuevas
-- 10. Índices optimizados para queries multi-tenant
--
-- COMPATIBILIDAD:
-- ✅ Compatible con migraciones existentes
-- ✅ No modifica tablas existentes destructivamente
-- ✅ RLS policies complementarias (no reemplazan las existentes)
-- ============================================================================

-- ============================================================================
-- PASO 1: CREAR TABLA user_preferences (Persistencia de Contexto)
-- ============================================================================
-- Esta tabla almacena preferencias del usuario incluyendo la organización activa

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Organización activa (contexto actual de trabajo)
    active_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    
    -- Preferencias de UI
    ui_preferences JSONB DEFAULT '{}',
    
    -- Preferencias de notificaciones
    notification_preferences JSONB DEFAULT '{
        "email": true,
        "push": false,
        "renewalReminders": true,
        "policyAlerts": true
    }',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id 
    ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_active_org_id 
    ON public.user_preferences(active_org_id);

-- Comentarios
COMMENT ON TABLE public.user_preferences IS 'Preferencias de usuario incluyendo organización activa para multi-tenancy';
COMMENT ON COLUMN public.user_preferences.active_org_id IS 'Organización actualmente seleccionada por el usuario';

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PASO 2: RLS para user_preferences
-- ============================================================================

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Política: Cada usuario solo puede ver sus propias preferencias
CREATE POLICY "users_can_view_own_preferences"
    ON public.user_preferences FOR SELECT
    USING (user_id = auth.uid());

-- Política: Cada usuario solo puede insertar sus propias preferencias
CREATE POLICY "users_can_insert_own_preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Política: Cada usuario solo puede actualizar sus propias preferencias
CREATE POLICY "users_can_update_own_preferences"
    ON public.user_preferences FOR UPDATE
    USING (user_id = auth.uid());

-- Política: Cada usuario solo puede eliminar sus propias preferencias
CREATE POLICY "users_can_delete_own_preferences"
    ON public.user_preferences FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================================
-- PASO 3: FUNCIONES DE CONTEXTO DE ORGANIZACIÓN
-- ============================================================================

-- Función: Obtener el org_id del contexto actual
-- Esta función es usada por las políticas RLS para filtrar por organización
CREATE OR REPLACE FUNCTION public.get_current_org_id()
RETURNS UUID AS $$
DECLARE
    ctx_org_id UUID;
    pref_org_id UUID;
    first_org_id UUID;
BEGIN
    -- Prioridad 1: Variable de configuración de sesión (set por el backend)
    BEGIN
        ctx_org_id := current_setting('app.current_org_id', true)::UUID;
        IF ctx_org_id IS NOT NULL THEN
            -- Validar que el usuario es miembro de esta organización
            IF EXISTS (
                SELECT 1 FROM public.org_members 
                WHERE org_id = ctx_org_id AND user_id = auth.uid()
            ) THEN
                RETURN ctx_org_id;
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Ignorar si la variable no está configurada o es inválida
        NULL;
    END;
    
    -- Prioridad 2: Preferencia guardada del usuario
    SELECT active_org_id INTO pref_org_id
    FROM public.user_preferences
    WHERE user_id = auth.uid()
    AND active_org_id IS NOT NULL;
    
    IF pref_org_id IS NOT NULL THEN
        -- Validar que el usuario sigue siendo miembro
        IF EXISTS (
            SELECT 1 FROM public.org_members 
            WHERE org_id = pref_org_id AND user_id = auth.uid()
        ) THEN
            RETURN pref_org_id;
        END IF;
    END IF;
    
    -- Prioridad 3: Primera organización del usuario (fallback)
    SELECT org_id INTO first_org_id
    FROM public.org_members
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
    
    RETURN first_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_current_org_id() IS 
'Obtiene el org_id activo para el usuario actual. Usado por RLS policies.
Prioridad: 1) Variable de sesión, 2) Preferencia guardada, 3) Primera org del usuario';

-- Función: Establecer el contexto de organización para la sesión
CREATE OR REPLACE FUNCTION public.set_org_context(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Validar que el usuario es miembro de la organización
    IF NOT EXISTS (
        SELECT 1 FROM public.org_members 
        WHERE org_id = org_uuid AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'User is not a member of organization %', org_uuid;
    END IF;
    
    -- Establecer la variable de sesión
    PERFORM set_config('app.current_org_id', org_uuid::text, false);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.set_org_context(UUID) IS 
'Establece la organización activa para la sesión actual de base de datos';

-- Función: Obtener todas las organizaciones de un usuario con sus roles
CREATE OR REPLACE FUNCTION public.get_user_organizations(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    org_slug TEXT,
    user_role TEXT,
    is_active BOOLEAN,
    member_since TIMESTAMPTZ
) AS $$
DECLARE
    effective_user_id UUID;
    current_active_org UUID;
BEGIN
    -- Usar el user_id proporcionado o el usuario actual
    effective_user_id := COALESCE(target_user_id, auth.uid());
    
    -- Obtener la organización activa actual
    SELECT active_org_id INTO current_active_org
    FROM public.user_preferences
    WHERE user_id = effective_user_id;
    
    RETURN QUERY
    SELECT 
        o.id AS org_id,
        o.name AS org_name,
        o.slug AS org_slug,
        om.role AS user_role,
        (o.id = current_active_org) AS is_active,
        om.created_at AS member_since
    FROM public.org_members om
    INNER JOIN public.organizations o ON o.id = om.org_id
    WHERE om.user_id = effective_user_id
    ORDER BY 
        (o.id = current_active_org) DESC, -- Org activa primero
        om.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_organizations(UUID) IS 
'Lista todas las organizaciones de un usuario con su rol y estado activo';

-- Función: Cambiar de organización (persistente)
CREATE OR REPLACE FUNCTION public.switch_organization(new_org_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    org_name TEXT;
    org_slug TEXT;
    user_role TEXT;
BEGIN
    -- Validar que el usuario es miembro de la nueva organización
    SELECT om.role, o.name, o.slug
    INTO user_role, org_name, org_slug
    FROM public.org_members om
    INNER JOIN public.organizations o ON o.id = om.org_id
    WHERE om.org_id = new_org_id AND om.user_id = auth.uid();
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User is not a member of this organization'
        );
    END IF;
    
    -- Actualizar o insertar preferencias
    INSERT INTO public.user_preferences (user_id, active_org_id)
    VALUES (auth.uid(), new_org_id)
    ON CONFLICT (user_id) DO UPDATE
    SET active_org_id = new_org_id, updated_at = NOW();
    
    -- Establecer también el contexto de sesión
    PERFORM public.set_org_context(new_org_id);
    
    RETURN jsonb_build_object(
        'success', true,
        'org_id', new_org_id,
        'org_name', org_name,
        'org_slug', org_slug,
        'user_role', user_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.switch_organization(UUID) IS 
'Cambia la organización activa del usuario y persiste la preferencia';

-- ============================================================================
-- PASO 4: CREAR ENUMS PARA RENOVACIONES (si no existen)
-- ============================================================================

-- Enum: Estado de renovación
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'renewal_status_enum') THEN
        CREATE TYPE public.renewal_status_enum AS ENUM (
            'pending',     -- Esperando revisión
            'in_review',   -- En análisis
            'approved',    -- Lista para renovar
            'renewed',     -- Renovada exitosamente
            'expired'      -- Expiró sin renovación
        );
    END IF;
END $$;

-- Enum: Estado de ventana de renovación
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'renewal_window_status_enum') THEN
        CREATE TYPE public.renewal_window_status_enum AS ENUM (
            'ok',        -- Más de 30 días
            'dueSoon',   -- 30 días o menos
            'overdue'    -- Vencida
        );
    END IF;
END $$;

-- Enum: Tipos de alerta de renovación
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'renewal_alert_type_enum') THEN
        CREATE TYPE public.renewal_alert_type_enum AS ENUM (
            'reminder',           -- Recordatorio general
            'premium_increase',   -- Prima aumentó significativamente
            'coverage_change',    -- Coberturas cambiaron
            'expiry_warning',     -- Por vencer
            'document_required'   -- Faltan documentos
        );
    END IF;
END $$;

-- Enum: Severidad de alertas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_severity_enum') THEN
        CREATE TYPE public.alert_severity_enum AS ENUM (
            'info',
            'warning',
            'critical'
        );
    END IF;
END $$;

-- ============================================================================
-- PASO 5: CREAR TABLA renewals (Tracking de Renovaciones)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    policy_analysis_id UUID REFERENCES public.policy_analyses(id) ON DELETE SET NULL,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    
    -- Identificación de póliza
    carrier VARCHAR(255) NOT NULL,
    policy_number VARCHAR(100),
    plan_name VARCHAR(255) NOT NULL,
    
    -- Fechas de vigencia
    current_start_date TIMESTAMPTZ(6) NOT NULL,
    current_end_date TIMESTAMPTZ(6) NOT NULL,
    renewal_date TIMESTAMPTZ(6) NOT NULL,
    
    -- Datos financieros (montos en centavos)
    current_premium_minor INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'COP',
    proposed_premium_minor INTEGER,
    premium_change_pct DECIMAL(5,2),
    
    -- Estado
    status public.renewal_status_enum DEFAULT 'pending',
    renewal_window_status public.renewal_window_status_enum DEFAULT 'ok',
    
    -- Recordatorios
    reminder_set BOOLEAN DEFAULT FALSE,
    reminder_date TIMESTAMPTZ(6),
    
    -- Notas
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ(6) DEFAULT NOW(),
    updated_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Índices para renewals
CREATE INDEX IF NOT EXISTS idx_renewals_case_id ON public.renewals(case_id);
CREATE INDEX IF NOT EXISTS idx_renewals_org_id ON public.renewals(org_id);
CREATE INDEX IF NOT EXISTS idx_renewals_policy_analysis_id ON public.renewals(policy_analysis_id);
CREATE INDEX IF NOT EXISTS idx_renewals_renewal_date ON public.renewals(renewal_date);
CREATE INDEX IF NOT EXISTS idx_renewals_status ON public.renewals(status);
CREATE INDEX IF NOT EXISTS idx_renewals_window_status ON public.renewals(renewal_window_status);

-- Índice compuesto para queries frecuentes (org + fecha + estado)
CREATE INDEX IF NOT EXISTS idx_renewals_org_date_status 
    ON public.renewals(org_id, renewal_date DESC, status);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_renewals_updated_at ON public.renewals;
CREATE TRIGGER update_renewals_updated_at
    BEFORE UPDATE ON public.renewals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Comentarios
COMMENT ON TABLE public.renewals IS 'Tracking de renovaciones de pólizas con aislamiento por organización';
COMMENT ON COLUMN public.renewals.current_premium_minor IS 'Prima actual en centavos (ej: 150000 = $1500.00)';

-- ============================================================================
-- PASO 6: CREAR TABLA renewal_history (Historial de Renovaciones)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.renewal_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    renewal_id UUID NOT NULL REFERENCES public.renewals(id) ON DELETE CASCADE,
    
    -- Información del período
    period_start TIMESTAMPTZ(6) NOT NULL,
    period_end TIMESTAMPTZ(6) NOT NULL,
    premium_minor INTEGER NOT NULL,
    currency VARCHAR(3) DEFAULT 'COP',
    
    -- Cambios detectados comparados con período anterior
    changes JSONB, -- { premiumChange: %, coveragesAdded: [], coveragesRemoved: [] }
    
    -- Referencia a documentos fuente
    policy_analysis_id UUID,
    artifact_id UUID,
    
    -- Timestamp
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Índices para renewal_history
CREATE INDEX IF NOT EXISTS idx_renewal_history_renewal_id ON public.renewal_history(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_history_period ON public.renewal_history(period_start, period_end);

-- Comentarios
COMMENT ON TABLE public.renewal_history IS 'Registro histórico de períodos de renovación para análisis de tendencias';

-- ============================================================================
-- PASO 7: CREAR TABLA renewal_alerts (Alertas de Renovaciones)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.renewal_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    renewal_id UUID NOT NULL REFERENCES public.renewals(id) ON DELETE CASCADE,
    
    -- Detalles de la alerta
    alert_type public.renewal_alert_type_enum NOT NULL,
    severity public.alert_severity_enum DEFAULT 'info',
    message TEXT NOT NULL,
    
    -- Tracking
    sent_at TIMESTAMPTZ(6),
    acknowledged_at TIMESTAMPTZ(6),
    dismissed_at TIMESTAMPTZ(6),
    
    -- Usuario destino
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ(6) DEFAULT NOW()
);

-- Índices para renewal_alerts
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_renewal_id ON public.renewal_alerts(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_sent_at ON public.renewal_alerts(sent_at);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_type ON public.renewal_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_renewal_alerts_user_id ON public.renewal_alerts(user_id);

-- Comentarios
COMMENT ON TABLE public.renewal_alerts IS 'Alertas y notificaciones relacionadas con renovaciones';

-- ============================================================================
-- PASO 8: RLS PARA renewals
-- ============================================================================

ALTER TABLE public.renewals ENABLE ROW LEVEL SECURITY;

-- SELECT: Miembros de la organización pueden ver renovaciones
CREATE POLICY "renewals_org_isolation_select"
    ON public.renewals FOR SELECT
    USING (
        org_id IN (
            SELECT om.org_id FROM public.org_members om
            WHERE om.user_id = auth.uid()
        )
    );

-- INSERT: Miembros pueden crear renovaciones en su organización
CREATE POLICY "renewals_org_isolation_insert"
    ON public.renewals FOR INSERT
    WITH CHECK (
        org_id IN (
            SELECT om.org_id FROM public.org_members om
            WHERE om.user_id = auth.uid()
        )
    );

-- UPDATE: Miembros pueden actualizar renovaciones de su organización
CREATE POLICY "renewals_org_isolation_update"
    ON public.renewals FOR UPDATE
    USING (
        org_id IN (
            SELECT om.org_id FROM public.org_members om
            WHERE om.user_id = auth.uid()
        )
    );

-- DELETE: Solo admin y owner pueden eliminar renovaciones
CREATE POLICY "renewals_org_isolation_delete"
    ON public.renewals FOR DELETE
    USING (
        org_id IN (
            SELECT om.org_id FROM public.org_members om
            WHERE om.user_id = auth.uid()
            AND om.role IN ('owner', 'admin')
        )
    );

-- ============================================================================
-- PASO 9: RLS PARA renewal_history (hereda de renewals)
-- ============================================================================

ALTER TABLE public.renewal_history ENABLE ROW LEVEL SECURITY;

-- SELECT: A través de renewals
CREATE POLICY "renewal_history_org_isolation_select"
    ON public.renewal_history FOR SELECT
    USING (
        renewal_id IN (
            SELECT r.id FROM public.renewals r
            WHERE r.org_id IN (
                SELECT om.org_id FROM public.org_members om
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- INSERT: A través de renewals
CREATE POLICY "renewal_history_org_isolation_insert"
    ON public.renewal_history FOR INSERT
    WITH CHECK (
        renewal_id IN (
            SELECT r.id FROM public.renewals r
            WHERE r.org_id IN (
                SELECT om.org_id FROM public.org_members om
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- UPDATE: A través de renewals
CREATE POLICY "renewal_history_org_isolation_update"
    ON public.renewal_history FOR UPDATE
    USING (
        renewal_id IN (
            SELECT r.id FROM public.renewals r
            WHERE r.org_id IN (
                SELECT om.org_id FROM public.org_members om
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- DELETE: Solo admin/owner
CREATE POLICY "renewal_history_org_isolation_delete"
    ON public.renewal_history FOR DELETE
    USING (
        renewal_id IN (
            SELECT r.id FROM public.renewals r
            WHERE r.org_id IN (
                SELECT om.org_id FROM public.org_members om
                WHERE om.user_id = auth.uid()
                AND om.role IN ('owner', 'admin')
            )
        )
    );

-- ============================================================================
-- PASO 10: RLS PARA renewal_alerts (hereda de renewals)
-- ============================================================================

ALTER TABLE public.renewal_alerts ENABLE ROW LEVEL SECURITY;

-- SELECT: A través de renewals o si es el usuario destinatario
CREATE POLICY "renewal_alerts_org_isolation_select"
    ON public.renewal_alerts FOR SELECT
    USING (
        user_id = auth.uid() -- Alertas dirigidas al usuario
        OR renewal_id IN (
            SELECT r.id FROM public.renewals r
            WHERE r.org_id IN (
                SELECT om.org_id FROM public.org_members om
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- INSERT: A través de renewals
CREATE POLICY "renewal_alerts_org_isolation_insert"
    ON public.renewal_alerts FOR INSERT
    WITH CHECK (
        renewal_id IN (
            SELECT r.id FROM public.renewals r
            WHERE r.org_id IN (
                SELECT om.org_id FROM public.org_members om
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- UPDATE: Propio o a través de renewals
CREATE POLICY "renewal_alerts_org_isolation_update"
    ON public.renewal_alerts FOR UPDATE
    USING (
        user_id = auth.uid() -- Puede actualizar sus propias alertas (acknowledge/dismiss)
        OR renewal_id IN (
            SELECT r.id FROM public.renewals r
            WHERE r.org_id IN (
                SELECT om.org_id FROM public.org_members om
                WHERE om.user_id = auth.uid()
            )
        )
    );

-- DELETE: Solo admin/owner
CREATE POLICY "renewal_alerts_org_isolation_delete"
    ON public.renewal_alerts FOR DELETE
    USING (
        renewal_id IN (
            SELECT r.id FROM public.renewals r
            WHERE r.org_id IN (
                SELECT om.org_id FROM public.org_members om
                WHERE om.user_id = auth.uid()
                AND om.role IN ('owner', 'admin')
            )
        )
    );

-- ============================================================================
-- PASO 11: FUNCIÓN HELPER PARA VALIDAR ACCESO A ORGANIZACIÓN
-- ============================================================================

-- Función optimizada para validación de acceso (usada en APIs)
CREATE OR REPLACE FUNCTION public.validate_org_access(
    target_org_id UUID,
    required_role TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    IF required_role IS NULL THEN
        -- Solo verificar membresía
        RETURN EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_id = target_org_id AND user_id = auth.uid()
        );
    ELSE
        -- Verificar membresía Y rol específico
        RETURN EXISTS (
            SELECT 1 FROM public.org_members
            WHERE org_id = target_org_id 
            AND user_id = auth.uid()
            AND role = required_role
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Función para verificar si es admin o owner
CREATE OR REPLACE FUNCTION public.validate_org_admin_access(target_org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = target_org_id 
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- PASO 12: VISTA PARA DASHBOARD MULTI-ORG
-- ============================================================================

-- Vista: Resumen de organizaciones del usuario con métricas
CREATE OR REPLACE VIEW public.user_org_dashboard AS
SELECT 
    o.id AS org_id,
    o.name AS org_name,
    o.slug AS org_slug,
    om.role AS user_role,
    (up.active_org_id = o.id) AS is_active,
    om.created_at AS member_since,
    COALESCE(case_counts.total_cases, 0) AS total_cases,
    COALESCE(case_counts.active_cases, 0) AS active_cases,
    COALESCE(renewal_counts.pending_renewals, 0) AS pending_renewals,
    COALESCE(renewal_counts.overdue_renewals, 0) AS overdue_renewals
FROM public.org_members om
INNER JOIN public.organizations o ON o.id = om.org_id
LEFT JOIN public.user_preferences up ON up.user_id = om.user_id
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) AS total_cases,
        COUNT(*) FILTER (WHERE status NOT IN ('closed', 'archived')) AS active_cases
    FROM public.cases c
    WHERE c.org_id = o.id
) case_counts ON TRUE
LEFT JOIN LATERAL (
    SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_renewals,
        COUNT(*) FILTER (WHERE renewal_window_status = 'overdue') AS overdue_renewals
    FROM public.renewals r
    WHERE r.org_id = o.id
) renewal_counts ON TRUE
WHERE om.user_id = auth.uid();

COMMENT ON VIEW public.user_org_dashboard IS 
'Vista de dashboard con métricas de todas las organizaciones del usuario actual';

-- ============================================================================
-- PASO 13: FUNCIÓN PARA INICIALIZAR PREFERENCIAS DE USUARIO
-- ============================================================================

-- Función llamada automáticamente al crear un usuario o al primer login
CREATE OR REPLACE FUNCTION public.initialize_user_preferences()
RETURNS TRIGGER AS $$
DECLARE
    first_org_id UUID;
BEGIN
    -- Obtener la primera organización del usuario
    SELECT org_id INTO first_org_id
    FROM public.org_members
    WHERE user_id = NEW.user_id
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Crear preferencias si no existen
    INSERT INTO public.user_preferences (user_id, active_org_id)
    VALUES (NEW.user_id, first_org_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Cuando un usuario es agregado a una organización, inicializar preferencias
DROP TRIGGER IF EXISTS trigger_initialize_user_preferences ON public.org_members;
CREATE TRIGGER trigger_initialize_user_preferences
    AFTER INSERT ON public.org_members
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_user_preferences();

-- ============================================================================
-- PASO 14: BACKFILL - Crear preferencias para usuarios existentes
-- ============================================================================

-- Insertar preferencias para usuarios que no las tienen
-- Usamos una subquery con DISTINCT ON en lugar de MIN(uuid) que no existe en PostgreSQL
INSERT INTO public.user_preferences (user_id, active_org_id)
SELECT DISTINCT ON (om.user_id)
    om.user_id,
    om.org_id -- Primera org por orden de created_at
FROM public.org_members om
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_preferences up
    WHERE up.user_id = om.user_id
)
ORDER BY om.user_id, om.created_at ASC
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- PASO 15: GRANTS DE SEGURIDAD
-- ============================================================================

-- Otorgar permisos a las funciones para usuarios autenticados
GRANT EXECUTE ON FUNCTION public.get_current_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_org_context(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_organizations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.switch_organization(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_org_access(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_org_admin_access(UUID) TO authenticated;

-- Otorgar acceso a las tablas para usuarios autenticados (RLS protege los datos)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.renewal_alerts TO authenticated;

-- Otorgar acceso a la vista
GRANT SELECT ON public.user_org_dashboard TO authenticated;

-- ============================================================================
-- MIGRACIÓN COMPLETADA
-- ============================================================================
-- 
-- PRÓXIMOS PASOS DESPUÉS DE APLICAR ESTA MIGRACIÓN:
-- 
-- 1. Actualizar prisma/schema.prisma para reflejar las nuevas tablas
-- 2. Ejecutar: npx prisma generate
-- 3. Actualizar src/lib/helpers/getCurrentOrg.ts para usar la nueva lógica
-- 4. Implementar el selector de organización en el frontend
-- 5. Actualizar los stores de Zustand para limpiar estado al cambiar de org
-- 
-- VERIFICACIÓN:
-- Ejecutar estas queries para verificar la migración:
-- 
-- -- Ver funciones creadas:
-- SELECT proname FROM pg_proc WHERE proname LIKE '%org%' AND pronamespace = 'public'::regnamespace;
-- 
-- -- Ver tablas con RLS habilitado:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
-- 
-- -- Probar cambio de organización (reemplazar UUIDs):
-- SELECT public.switch_organization('550e8400-e29b-41d4-a716-446655440000');
-- 
-- ============================================================================
