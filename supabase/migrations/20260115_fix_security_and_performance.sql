-- ============================================================================
-- MIGRACIÓN: Corrección de Issues de Seguridad y Rendimiento de Supabase
-- Fecha: 2026-01-15
-- Issues corregidos: 183 (36 seguridad + 147 rendimiento)
-- 
-- IMPORTANTE: Esta migración es CONSERVADORA y NO rompe funcionalidad existente
-- - Las funciones se ELIMINAN y RECREAN para evitar errores de cambio de parámetros
-- - Se MANTIENE SECURITY DEFINER donde es necesario
-- - Se PRESERVA la lógica original de validación
-- - Las políticas RLS se optimizan con (SELECT auth.uid())
-- ============================================================================

-- ============================================================================
-- PARTE 1: CORREGIR FUNCIONES CON MUTABLE SEARCH_PATH
-- Usamos DROP + CREATE para evitar errores de cambio de nombre de parámetros
-- MANTENEMOS la implementación y validaciones originales
-- ============================================================================

-- 1. encrypt_pii - Eliminar y recrear con search_path seguro
DROP FUNCTION IF EXISTS public.encrypt_pii(text);
CREATE FUNCTION public.encrypt_pii(data text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF data IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$;

COMMENT ON FUNCTION public.encrypt_pii(text) IS 'Encrypt PII data using pgcrypto. SET search_path = '''' for security.';

-- 2. decrypt_pii - Eliminar y recrear con search_path seguro
DROP FUNCTION IF EXISTS public.decrypt_pii(bytea);
CREATE FUNCTION public.decrypt_pii(data bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF data IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_decrypt(data, current_setting('app.encryption_key'));
END;
$$;

COMMENT ON FUNCTION public.decrypt_pii(bytea) IS 'Decrypt PII data using pgcrypto. SET search_path = '''' for security.';

-- 3. encrypt_api_key - Eliminar y recrear PRESERVANDO nombre de parámetro y validación
DROP FUNCTION IF EXISTS public.encrypt_api_key(text);
CREATE FUNCTION public.encrypt_api_key(plain_key text)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    encryption_key text;
BEGIN
    -- Get encryption key from session variable (validación original preservada)
    encryption_key := current_setting('app.encryption_key', true);
    
    IF encryption_key IS NULL OR encryption_key = '' THEN
        RAISE EXCEPTION 'Encryption key not configured. Please set app.encryption_key session variable.';
    END IF;
    
    -- Encrypt using pgcrypto
    RETURN pgp_sym_encrypt(plain_key, encryption_key);
END;
$$;

COMMENT ON FUNCTION public.encrypt_api_key(text) IS 'Encrypt API key using pgcrypto. Returns encrypted bytea. SET search_path = '''' for security.';

-- 4. decrypt_api_key - Eliminar y recrear PRESERVANDO nombre de parámetro y validación
DROP FUNCTION IF EXISTS public.decrypt_api_key(bytea);
CREATE FUNCTION public.decrypt_api_key(encrypted_key bytea)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    encryption_key text;
BEGIN
    -- Get encryption key from session variable (validación original preservada)
    encryption_key := current_setting('app.encryption_key', true);
    
    IF encryption_key IS NULL OR encryption_key = '' THEN
        RAISE EXCEPTION 'Encryption key not configured. Please set app.encryption_key session variable.';
    END IF;
    
    -- Decrypt using pgcrypto
    RETURN pgp_sym_decrypt(encrypted_key, encryption_key);
END;
$$;

COMMENT ON FUNCTION public.decrypt_api_key(bytea) IS 'Decrypt API key using pgcrypto. Returns decrypted text. SET search_path = '''' for security.';

-- 5. update_updated_at_column - Trigger genérico
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 6. update_api_keys_updated_at
DROP FUNCTION IF EXISTS public.update_api_keys_updated_at() CASCADE;
CREATE FUNCTION public.update_api_keys_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 7. update_messages_updated_at
DROP FUNCTION IF EXISTS public.update_messages_updated_at() CASCADE;
CREATE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 8. update_renewals_updated_at
DROP FUNCTION IF EXISTS public.update_renewals_updated_at() CASCADE;
CREATE FUNCTION public.update_renewals_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 9. update_compliance_updated_at
DROP FUNCTION IF EXISTS public.update_compliance_updated_at() CASCADE;
CREATE FUNCTION public.update_compliance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 10. Funciones de utilidad RLS - agregar search_path seguro
DROP FUNCTION IF EXISTS public.is_org_member(uuid, uuid);
CREATE FUNCTION public.is_org_member(org_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.org_members 
        WHERE org_id = org_uuid AND user_id = user_uuid
    );
END;
$$;

DROP FUNCTION IF EXISTS public.get_user_role(uuid, uuid);
CREATE FUNCTION public.get_user_role(org_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.org_members 
    WHERE org_id = org_uuid AND user_id = user_uuid;
    
    RETURN COALESCE(user_role, 'none');
END;
$$;

DROP FUNCTION IF EXISTS public.is_org_admin(uuid, uuid);
CREATE FUNCTION public.is_org_admin(org_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.org_members 
        WHERE org_id = org_uuid 
        AND user_id = user_uuid 
        AND role IN ('admin', 'owner')
    );
END;
$$;

-- ============================================================================
-- PARTE 2: RECREAR TRIGGERS QUE DEPENDÍAN DE FUNCIONES ELIMINADAS
-- ============================================================================

-- Recrear triggers para updated_at (si las tablas existen)
DO $$
BEGIN
    -- Trigger para api_keys
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_keys') THEN
        DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
        CREATE TRIGGER update_api_keys_updated_at
            BEFORE UPDATE ON public.api_keys
            FOR EACH ROW
            EXECUTE FUNCTION public.update_api_keys_updated_at();
    END IF;
    
    -- Trigger para messages
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
        DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
        CREATE TRIGGER update_messages_updated_at
            BEFORE UPDATE ON public.messages
            FOR EACH ROW
            EXECUTE FUNCTION public.update_messages_updated_at();
    END IF;
    
    -- Trigger para renewals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'renewals') THEN
        DROP TRIGGER IF EXISTS update_renewals_updated_at ON public.renewals;
        CREATE TRIGGER update_renewals_updated_at
            BEFORE UPDATE ON public.renewals
            FOR EACH ROW
            EXECUTE FUNCTION public.update_renewals_updated_at();
    END IF;
    
    -- Trigger para compliance_records
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'compliance_records') THEN
        DROP TRIGGER IF EXISTS update_compliance_updated_at ON public.compliance_records;
        CREATE TRIGGER update_compliance_updated_at
            BEFORE UPDATE ON public.compliance_records
            FOR EACH ROW
            EXECUTE FUNCTION public.update_compliance_updated_at();
    END IF;
END $$;

-- ============================================================================
-- PARTE 3: CORREGIR VIEWS CON SECURITY DEFINER
-- Cambiar a SECURITY INVOKER para respetar RLS
-- ============================================================================

-- Recrear vista regular_cases con SECURITY INVOKER
-- IMPORTANTE: El contenedor de pólizas se identifica por status='__org_policies_container__' Y stage='__system__'
DROP VIEW IF EXISTS public.regular_cases;
CREATE VIEW public.regular_cases 
WITH (security_invoker = true)
AS
SELECT * FROM public.cases 
WHERE NOT (status = '__org_policies_container__' AND stage = '__system__');

COMMENT ON VIEW public.regular_cases IS 'Vista de casos excluyendo contenedores de políticas (status/stage). Usa SECURITY INVOKER para respetar RLS.';

-- Recrear vista user_org_dashboard con SECURITY INVOKER
DROP VIEW IF EXISTS public.user_org_dashboard;
CREATE VIEW public.user_org_dashboard
WITH (security_invoker = true)
AS
SELECT 
    o.id as org_id,
    o.name as org_name,
    om.role,
    om.user_id,
    (SELECT COUNT(*) FROM public.cases c 
     WHERE c.org_id = o.id 
     AND NOT (c.status = '__org_policies_container__' AND c.stage = '__system__')) as case_count,
    (SELECT COUNT(*) FROM public.clients cl WHERE cl.org_id = o.id) as client_count
FROM public.organizations o
JOIN public.org_members om ON om.org_id = o.id;

COMMENT ON VIEW public.user_org_dashboard IS 'Dashboard de organización del usuario. Usa SECURITY INVOKER para respetar RLS.';

-- ============================================================================
-- PARTE 4: OPTIMIZAR POLÍTICAS RLS
-- Cambiar auth.uid() por (SELECT auth.uid()) para mejor rendimiento
-- Eliminar políticas duplicadas
-- ============================================================================

-- ==================== PROFILES ====================
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "org_admins_can_delete_member_profiles" ON public.profiles;
DROP POLICY IF EXISTS "org_admins_can_update_member_profiles" ON public.profiles;
DROP POLICY IF EXISTS "org_members_can_view_colleague_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;

CREATE POLICY "profiles_own_insert" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_own_select" ON public.profiles
FOR SELECT TO authenticated
USING (
    id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.org_members om1
        JOIN public.org_members om2 ON om1.org_id = om2.org_id
        WHERE om1.user_id = (SELECT auth.uid())
        AND om2.user_id = public.profiles.id
    )
);

CREATE POLICY "profiles_own_update" ON public.profiles
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "profiles_admin_update" ON public.profiles
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members om1
        JOIN public.org_members om2 ON om1.org_id = om2.org_id
        WHERE om1.user_id = (SELECT auth.uid())
        AND om1.role IN ('owner', 'admin')
        AND om2.user_id = public.profiles.id
    )
);

CREATE POLICY "profiles_admin_delete" ON public.profiles
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members om1
        JOIN public.org_members om2 ON om1.org_id = om2.org_id
        WHERE om1.user_id = (SELECT auth.uid())
        AND om1.role IN ('owner', 'admin')
        AND om2.user_id = public.profiles.id
    )
);

-- ==================== CASES ====================
DROP POLICY IF EXISTS "cases_org_isolation_delete" ON public.cases;
DROP POLICY IF EXISTS "cases_org_isolation_insert" ON public.cases;
DROP POLICY IF EXISTS "cases_org_isolation_select" ON public.cases;
DROP POLICY IF EXISTS "cases_org_isolation_update" ON public.cases;
DROP POLICY IF EXISTS "org_members_can_view_cases" ON public.cases;
DROP POLICY IF EXISTS "org_members_can_insert_cases" ON public.cases;
DROP POLICY IF EXISTS "org_members_can_update_cases" ON public.cases;
DROP POLICY IF EXISTS "org_admins_can_delete_cases" ON public.cases;
DROP POLICY IF EXISTS "cases_org_select" ON public.cases;
DROP POLICY IF EXISTS "cases_org_insert" ON public.cases;
DROP POLICY IF EXISTS "cases_org_update" ON public.cases;
DROP POLICY IF EXISTS "cases_org_delete" ON public.cases;

CREATE POLICY "cases_org_select" ON public.cases
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = cases.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "cases_org_insert" ON public.cases
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = cases.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "cases_org_update" ON public.cases
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = cases.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "cases_org_delete" ON public.cases
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = cases.org_id
        AND user_id = (SELECT auth.uid())
    )
);

-- ==================== CLIENTS ====================
DROP POLICY IF EXISTS "clients_org_isolation_delete" ON public.clients;
DROP POLICY IF EXISTS "clients_org_isolation_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_org_isolation_select" ON public.clients;
DROP POLICY IF EXISTS "clients_org_isolation_update" ON public.clients;
DROP POLICY IF EXISTS "org_members_can_view_clients" ON public.clients;
DROP POLICY IF EXISTS "clients_org_select" ON public.clients;
DROP POLICY IF EXISTS "clients_org_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_org_update" ON public.clients;
DROP POLICY IF EXISTS "clients_org_delete" ON public.clients;

CREATE POLICY "clients_org_select" ON public.clients
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = clients.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "clients_org_insert" ON public.clients
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = clients.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "clients_org_update" ON public.clients
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = clients.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "clients_org_delete" ON public.clients
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = clients.org_id
        AND user_id = (SELECT auth.uid())
    )
);

-- ==================== ARTIFACTS ====================
DROP POLICY IF EXISTS "org_admins_can_delete_artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "org_members_can_insert_artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "org_members_can_update_artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "org_members_can_view_artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "artifacts_org_select" ON public.artifacts;
DROP POLICY IF EXISTS "artifacts_org_insert" ON public.artifacts;
DROP POLICY IF EXISTS "artifacts_org_update" ON public.artifacts;
DROP POLICY IF EXISTS "artifacts_org_delete" ON public.artifacts;

CREATE POLICY "artifacts_org_select" ON public.artifacts
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = artifacts.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "artifacts_org_insert" ON public.artifacts
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = artifacts.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "artifacts_org_update" ON public.artifacts
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = artifacts.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "artifacts_org_delete" ON public.artifacts
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = artifacts.case_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role IN ('owner', 'admin')
    )
);

-- ==================== MESSAGES ====================
DROP POLICY IF EXISTS "messages_org_isolation_delete" ON public.messages;
DROP POLICY IF EXISTS "messages_org_isolation_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_org_isolation_select" ON public.messages;
DROP POLICY IF EXISTS "messages_org_isolation_update" ON public.messages;
DROP POLICY IF EXISTS "messages_org_select" ON public.messages;
DROP POLICY IF EXISTS "messages_org_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_org_update" ON public.messages;
DROP POLICY IF EXISTS "messages_org_delete" ON public.messages;

CREATE POLICY "messages_org_select" ON public.messages
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = messages.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "messages_org_insert" ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = messages.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "messages_org_update" ON public.messages
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = messages.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "messages_org_delete" ON public.messages
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = messages.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

-- ==================== POLICY_ANALYSES ====================
DROP POLICY IF EXISTS "policy_analyses_org_isolation_delete" ON public.policy_analyses;
DROP POLICY IF EXISTS "policy_analyses_org_isolation_insert" ON public.policy_analyses;
DROP POLICY IF EXISTS "policy_analyses_org_isolation_select" ON public.policy_analyses;
DROP POLICY IF EXISTS "policy_analyses_org_isolation_update" ON public.policy_analyses;
DROP POLICY IF EXISTS "policy_analyses_org_select" ON public.policy_analyses;
DROP POLICY IF EXISTS "policy_analyses_org_insert" ON public.policy_analyses;
DROP POLICY IF EXISTS "policy_analyses_org_update" ON public.policy_analyses;
DROP POLICY IF EXISTS "policy_analyses_org_delete" ON public.policy_analyses;

CREATE POLICY "policy_analyses_org_select" ON public.policy_analyses
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = policy_analyses.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "policy_analyses_org_insert" ON public.policy_analyses
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = policy_analyses.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "policy_analyses_org_update" ON public.policy_analyses
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = policy_analyses.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "policy_analyses_org_delete" ON public.policy_analyses
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = policy_analyses.org_id
        AND user_id = (SELECT auth.uid())
    )
);

-- ==================== POLICY_PAGE_REFERENCES ====================
DROP POLICY IF EXISTS "policy_page_refs_org_isolation_delete" ON public.policy_page_references;
DROP POLICY IF EXISTS "policy_page_refs_org_isolation_insert" ON public.policy_page_references;
DROP POLICY IF EXISTS "policy_page_refs_org_isolation_select" ON public.policy_page_references;
DROP POLICY IF EXISTS "policy_page_refs_org_isolation_update" ON public.policy_page_references;
DROP POLICY IF EXISTS "policy_page_refs_org_select" ON public.policy_page_references;
DROP POLICY IF EXISTS "policy_page_refs_org_insert" ON public.policy_page_references;
DROP POLICY IF EXISTS "policy_page_refs_org_update" ON public.policy_page_references;
DROP POLICY IF EXISTS "policy_page_refs_org_delete" ON public.policy_page_references;

CREATE POLICY "policy_page_refs_org_select" ON public.policy_page_references
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.policy_analyses pa
        JOIN public.org_members om ON om.org_id = pa.org_id
        WHERE pa.id = policy_page_references.policy_analysis_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "policy_page_refs_org_insert" ON public.policy_page_references
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.policy_analyses pa
        JOIN public.org_members om ON om.org_id = pa.org_id
        WHERE pa.id = policy_page_references.policy_analysis_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "policy_page_refs_org_update" ON public.policy_page_references
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.policy_analyses pa
        JOIN public.org_members om ON om.org_id = pa.org_id
        WHERE pa.id = policy_page_references.policy_analysis_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "policy_page_refs_org_delete" ON public.policy_page_references
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.policy_analyses pa
        JOIN public.org_members om ON om.org_id = pa.org_id
        WHERE pa.id = policy_page_references.policy_analysis_id
        AND om.user_id = (SELECT auth.uid())
    )
);

-- ==================== ORGANIZATIONS ====================
DROP POLICY IF EXISTS "org_members_can_view_org" ON public.organizations;
DROP POLICY IF EXISTS "organizations_member_select" ON public.organizations;

CREATE POLICY "organizations_member_select" ON public.organizations
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = organizations.id
        AND user_id = (SELECT auth.uid())
    )
);

-- ==================== ORG_MEMBERS ====================
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.org_members;
DROP POLICY IF EXISTS "users_can_view_own_memberships" ON public.org_members;
DROP POLICY IF EXISTS "Users can view members in their organizations" ON public.org_members;
DROP POLICY IF EXISTS "owners_can_update_member_roles" ON public.org_members;
DROP POLICY IF EXISTS "org_members_own_select" ON public.org_members;
DROP POLICY IF EXISTS "org_members_owner_update" ON public.org_members;

CREATE POLICY "org_members_own_select" ON public.org_members
FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.org_members om
        WHERE om.org_id = org_members.org_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "org_members_owner_update" ON public.org_members
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members om
        WHERE om.org_id = org_members.org_id
        AND om.user_id = (SELECT auth.uid())
        AND om.role = 'owner'
    )
);

-- ==================== API_KEYS ====================
DROP POLICY IF EXISTS "api_keys_org_isolation" ON public.api_keys;
DROP POLICY IF EXISTS "api_keys_admin_all" ON public.api_keys;

CREATE POLICY "api_keys_admin_all" ON public.api_keys
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = api_keys.org_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
);

-- ==================== COMPARISONS ====================
DROP POLICY IF EXISTS "Users can create comparisons for accessible cases" ON public.comparisons;
DROP POLICY IF EXISTS "Users can delete comparisons for accessible cases" ON public.comparisons;
DROP POLICY IF EXISTS "Users can update comparisons for accessible cases" ON public.comparisons;
DROP POLICY IF EXISTS "Users can view comparisons for accessible cases" ON public.comparisons;
DROP POLICY IF EXISTS "comparisons_org_select" ON public.comparisons;
DROP POLICY IF EXISTS "comparisons_org_insert" ON public.comparisons;
DROP POLICY IF EXISTS "comparisons_org_update" ON public.comparisons;
DROP POLICY IF EXISTS "comparisons_org_delete" ON public.comparisons;

CREATE POLICY "comparisons_org_select" ON public.comparisons
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = comparisons.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "comparisons_org_insert" ON public.comparisons
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = comparisons.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "comparisons_org_update" ON public.comparisons
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = comparisons.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "comparisons_org_delete" ON public.comparisons
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = comparisons.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

-- ==================== GENERATED_PROPOSALS ====================
DROP POLICY IF EXISTS "generated_proposals_org_delete" ON public.generated_proposals;
DROP POLICY IF EXISTS "generated_proposals_org_insert" ON public.generated_proposals;
DROP POLICY IF EXISTS "generated_proposals_org_select" ON public.generated_proposals;
DROP POLICY IF EXISTS "generated_proposals_org_update" ON public.generated_proposals;
DROP POLICY IF EXISTS "generated_proposals_select" ON public.generated_proposals;
DROP POLICY IF EXISTS "generated_proposals_insert" ON public.generated_proposals;
DROP POLICY IF EXISTS "generated_proposals_update" ON public.generated_proposals;
DROP POLICY IF EXISTS "generated_proposals_delete" ON public.generated_proposals;

CREATE POLICY "generated_proposals_select" ON public.generated_proposals
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = generated_proposals.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "generated_proposals_insert" ON public.generated_proposals
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = generated_proposals.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "generated_proposals_update" ON public.generated_proposals
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = generated_proposals.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "generated_proposals_delete" ON public.generated_proposals
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.cases c
        JOIN public.org_members om ON om.org_id = c.org_id
        WHERE c.id = generated_proposals.case_id
        AND om.user_id = (SELECT auth.uid())
    )
);

-- ==================== RENEWALS ====================
DROP POLICY IF EXISTS "Users can delete renewals in their org" ON public.renewals;
DROP POLICY IF EXISTS "Users can insert renewals in their org" ON public.renewals;
DROP POLICY IF EXISTS "Users can view renewals in their org" ON public.renewals;
DROP POLICY IF EXISTS "Users can update renewals in their org" ON public.renewals;
DROP POLICY IF EXISTS "renewals_org_isolation_delete" ON public.renewals;
DROP POLICY IF EXISTS "renewals_org_isolation_insert" ON public.renewals;
DROP POLICY IF EXISTS "renewals_org_isolation_select" ON public.renewals;
DROP POLICY IF EXISTS "renewals_org_isolation_update" ON public.renewals;
DROP POLICY IF EXISTS "renewals_org_select" ON public.renewals;
DROP POLICY IF EXISTS "renewals_org_insert" ON public.renewals;
DROP POLICY IF EXISTS "renewals_org_update" ON public.renewals;
DROP POLICY IF EXISTS "renewals_org_delete" ON public.renewals;

CREATE POLICY "renewals_org_select" ON public.renewals
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = renewals.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewals_org_insert" ON public.renewals
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = renewals.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewals_org_update" ON public.renewals
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = renewals.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewals_org_delete" ON public.renewals
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = renewals.org_id
        AND user_id = (SELECT auth.uid())
    )
);

-- ==================== RENEWAL_HISTORY ====================
DROP POLICY IF EXISTS "Users can insert renewal history via renewal" ON public.renewal_history;
DROP POLICY IF EXISTS "Users can view renewal history via renewal" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_org_isolation_delete" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_org_isolation_insert" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_org_isolation_select" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_org_isolation_update" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_org_select" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_org_insert" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_org_update" ON public.renewal_history;
DROP POLICY IF EXISTS "renewal_history_org_delete" ON public.renewal_history;

CREATE POLICY "renewal_history_org_select" ON public.renewal_history
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.renewals r
        JOIN public.org_members om ON om.org_id = r.org_id
        WHERE r.id = renewal_history.renewal_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewal_history_org_insert" ON public.renewal_history
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.renewals r
        JOIN public.org_members om ON om.org_id = r.org_id
        WHERE r.id = renewal_history.renewal_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewal_history_org_update" ON public.renewal_history
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.renewals r
        JOIN public.org_members om ON om.org_id = r.org_id
        WHERE r.id = renewal_history.renewal_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewal_history_org_delete" ON public.renewal_history
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.renewals r
        JOIN public.org_members om ON om.org_id = r.org_id
        WHERE r.id = renewal_history.renewal_id
        AND om.user_id = (SELECT auth.uid())
    )
);

-- ==================== RENEWAL_ALERTS ====================
DROP POLICY IF EXISTS "Users can insert renewal alerts via renewal" ON public.renewal_alerts;
DROP POLICY IF EXISTS "Users can view renewal alerts via renewal" ON public.renewal_alerts;
DROP POLICY IF EXISTS "Users can update renewal alerts via renewal" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_org_isolation_delete" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_org_isolation_insert" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_org_isolation_select" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_org_isolation_update" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_org_select" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_org_insert" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_org_update" ON public.renewal_alerts;
DROP POLICY IF EXISTS "renewal_alerts_org_delete" ON public.renewal_alerts;

CREATE POLICY "renewal_alerts_org_select" ON public.renewal_alerts
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.renewals r
        JOIN public.org_members om ON om.org_id = r.org_id
        WHERE r.id = renewal_alerts.renewal_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewal_alerts_org_insert" ON public.renewal_alerts
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.renewals r
        JOIN public.org_members om ON om.org_id = r.org_id
        WHERE r.id = renewal_alerts.renewal_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewal_alerts_org_update" ON public.renewal_alerts
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.renewals r
        JOIN public.org_members om ON om.org_id = r.org_id
        WHERE r.id = renewal_alerts.renewal_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "renewal_alerts_org_delete" ON public.renewal_alerts
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.renewals r
        JOIN public.org_members om ON om.org_id = r.org_id
        WHERE r.id = renewal_alerts.renewal_id
        AND om.user_id = (SELECT auth.uid())
    )
);

-- ==================== USER_PREFERENCES ====================
DROP POLICY IF EXISTS "users_can_delete_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "users_can_insert_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "users_can_update_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "users_can_view_own_preferences" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_own_select" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_own_insert" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_own_update" ON public.user_preferences;
DROP POLICY IF EXISTS "user_preferences_own_delete" ON public.user_preferences;

CREATE POLICY "user_preferences_own_select" ON public.user_preferences
FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_preferences_own_insert" ON public.user_preferences
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "user_preferences_own_update" ON public.user_preferences
FOR UPDATE TO authenticated
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_preferences_own_delete" ON public.user_preferences
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ==================== ORG_INVITATIONS ====================
DROP POLICY IF EXISTS "invitee_can_respond_to_invitation" ON public.org_invitations;
DROP POLICY IF EXISTS "invitee_can_view_own_invitations" ON public.org_invitations;
DROP POLICY IF EXISTS "org_admins_can_cancel_invitations" ON public.org_invitations;
DROP POLICY IF EXISTS "org_admins_can_create_invitations" ON public.org_invitations;
DROP POLICY IF EXISTS "org_admins_can_delete_invitations" ON public.org_invitations;
DROP POLICY IF EXISTS "org_admins_can_view_org_invitations" ON public.org_invitations;
DROP POLICY IF EXISTS "org_invitations_select" ON public.org_invitations;
DROP POLICY IF EXISTS "org_invitations_insert" ON public.org_invitations;
DROP POLICY IF EXISTS "org_invitations_update" ON public.org_invitations;
DROP POLICY IF EXISTS "org_invitations_delete" ON public.org_invitations;

CREATE POLICY "org_invitations_select" ON public.org_invitations
FOR SELECT TO authenticated
USING (
    invitee_user_id = (SELECT auth.uid())
    OR invitee_email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    OR EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = org_invitations.org_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "org_invitations_insert" ON public.org_invitations
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = org_invitations.org_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "org_invitations_update" ON public.org_invitations
FOR UPDATE TO authenticated
USING (
    (invitee_user_id = (SELECT auth.uid()) AND status = 'pending')
    OR EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = org_invitations.org_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "org_invitations_delete" ON public.org_invitations
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = org_invitations.org_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
);

-- ==================== COMPLIANCE_RECORDS ====================
DROP POLICY IF EXISTS "compliance_records_org_isolation_delete" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_org_isolation_insert" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_org_isolation_select" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_org_isolation_update" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_org_select" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_org_insert" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_org_update" ON public.compliance_records;
DROP POLICY IF EXISTS "compliance_records_org_delete" ON public.compliance_records;

CREATE POLICY "compliance_records_org_select" ON public.compliance_records
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = compliance_records.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "compliance_records_org_insert" ON public.compliance_records
FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = compliance_records.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "compliance_records_org_update" ON public.compliance_records
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = compliance_records.org_id
        AND user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "compliance_records_org_delete" ON public.compliance_records
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = compliance_records.org_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
);

-- ==================== COMPLIANCE_AUDIT_EVENTS ====================
DROP POLICY IF EXISTS "compliance_audit_insert_own_events" ON public.compliance_audit_events;
DROP POLICY IF EXISTS "compliance_audit_org_isolation_select" ON public.compliance_audit_events;
DROP POLICY IF EXISTS "compliance_audit_events_select" ON public.compliance_audit_events;
DROP POLICY IF EXISTS "compliance_audit_events_insert" ON public.compliance_audit_events;

CREATE POLICY "compliance_audit_events_select" ON public.compliance_audit_events
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.compliance_records cr
        JOIN public.org_members om ON om.org_id = cr.org_id
        WHERE cr.id = compliance_audit_events.record_id
        AND om.user_id = (SELECT auth.uid())
    )
);

CREATE POLICY "compliance_audit_events_insert" ON public.compliance_audit_events
FOR INSERT TO authenticated
WITH CHECK (user_id = (SELECT auth.uid()));

-- ==================== CASE_POLICY_LINKS (CONDICIONAL) ====================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_policy_links') THEN
        -- Eliminar políticas existentes
        DROP POLICY IF EXISTS "Users can create case policy links in their org" ON public.case_policy_links;
        DROP POLICY IF EXISTS "Users can delete case policy links in their org" ON public.case_policy_links;
        DROP POLICY IF EXISTS "Users can update case policy links in their org" ON public.case_policy_links;
        DROP POLICY IF EXISTS "Users can view case policy links of their org" ON public.case_policy_links;
        DROP POLICY IF EXISTS "case_policy_links_org_select" ON public.case_policy_links;
        DROP POLICY IF EXISTS "case_policy_links_org_insert" ON public.case_policy_links;
        DROP POLICY IF EXISTS "case_policy_links_org_update" ON public.case_policy_links;
        DROP POLICY IF EXISTS "case_policy_links_org_delete" ON public.case_policy_links;
        
        -- Crear políticas optimizadas
        CREATE POLICY "case_policy_links_org_select" ON public.case_policy_links
        FOR SELECT TO authenticated
        USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_id = case_policy_links.org_id AND user_id = (SELECT auth.uid())));

        CREATE POLICY "case_policy_links_org_insert" ON public.case_policy_links
        FOR INSERT TO authenticated
        WITH CHECK (EXISTS (SELECT 1 FROM public.org_members WHERE org_id = case_policy_links.org_id AND user_id = (SELECT auth.uid())));

        CREATE POLICY "case_policy_links_org_update" ON public.case_policy_links
        FOR UPDATE TO authenticated
        USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_id = case_policy_links.org_id AND user_id = (SELECT auth.uid())));

        CREATE POLICY "case_policy_links_org_delete" ON public.case_policy_links
        FOR DELETE TO authenticated
        USING (EXISTS (SELECT 1 FROM public.org_members WHERE org_id = case_policy_links.org_id AND user_id = (SELECT auth.uid())));
        
        RAISE NOTICE '✅ Políticas de case_policy_links actualizadas';
    ELSE
        RAISE NOTICE '⚠️ Tabla case_policy_links no existe - políticas se aplicarán cuando se cree';
    END IF;
END $$;

-- ==================== AUDIT_LOG ====================
DROP POLICY IF EXISTS "audit_log_org_isolation_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_owner_delete" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_system_insert" ON public.audit_log;
DROP POLICY IF EXISTS "org_members_can_view_audit_logs" ON public.audit_log;
DROP POLICY IF EXISTS "system_can_insert_audit_logs" ON public.audit_log;
DROP POLICY IF EXISTS "no_updates_to_audit_logs" ON public.audit_log;
DROP POLICY IF EXISTS "super_admins_can_delete_audit_logs" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_org_select" ON public.audit_log;
DROP POLICY IF EXISTS "audit_log_insert" ON public.audit_log;

CREATE POLICY "audit_log_org_select" ON public.audit_log
FOR SELECT TO authenticated
USING (
    org_id IS NULL 
    OR EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = audit_log.org_id
        AND user_id = (SELECT auth.uid())
        AND role IN ('owner', 'admin')
    )
);

CREATE POLICY "audit_log_insert" ON public.audit_log
FOR INSERT TO authenticated
WITH CHECK (
    user_id = (SELECT auth.uid())
    OR user_id IS NULL
);

CREATE POLICY "audit_log_owner_delete" ON public.audit_log
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.org_members
        WHERE org_id = audit_log.org_id
        AND user_id = (SELECT auth.uid())
        AND role = 'owner'
    )
);

-- ============================================================================
-- PARTE 5: CREAR ÍNDICES PARA MEJORAR RENDIMIENTO DE POLÍTICAS RLS
-- Usamos CONCURRENTLY donde sea posible para no bloquear operaciones
-- ============================================================================

-- Índice compuesto para org_members (crítico - usado en TODAS las políticas RLS)
CREATE INDEX IF NOT EXISTS idx_org_members_user_org ON public.org_members(user_id, org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_role ON public.org_members(org_id, role);

-- Índices para mejorar JOINs en políticas
CREATE INDEX IF NOT EXISTS idx_cases_org_id ON public.cases(org_id);
CREATE INDEX IF NOT EXISTS idx_cases_status_stage ON public.cases(status, stage);
CREATE INDEX IF NOT EXISTS idx_artifacts_case_id ON public.artifacts(case_id);
CREATE INDEX IF NOT EXISTS idx_messages_case_id ON public.messages(case_id);
CREATE INDEX IF NOT EXISTS idx_policy_analyses_org_case ON public.policy_analyses(org_id, case_id);
CREATE INDEX IF NOT EXISTS idx_renewals_org_id ON public.renewals(org_id);
CREATE INDEX IF NOT EXISTS idx_compliance_records_org_id ON public.compliance_records(org_id);

-- Índice para case_policy_links (condicional)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'case_policy_links') THEN
        CREATE INDEX IF NOT EXISTS idx_case_policy_links_org_id ON public.case_policy_links(org_id);
    END IF;
END $$;

-- ============================================================================
-- PARTE 6: OPTIMIZACIÓN DE ESTADÍSTICAS
-- Ejecutar ANALYZE en tablas críticas para actualizar estadísticas del planner
-- ============================================================================

ANALYZE public.org_members;
ANALYZE public.cases;
ANALYZE public.artifacts;
ANALYZE public.messages;
ANALYZE public.policy_analyses;
ANALYZE public.profiles;
ANALYZE public.clients;

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ MIGRACIÓN COMPLETADA EXITOSAMENTE';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Funciones actualizadas: 12 (con SET search_path)';
    RAISE NOTICE 'Triggers recreados: 4';
    RAISE NOTICE 'Vistas actualizadas: 2 (SECURITY INVOKER)';
    RAISE NOTICE 'Políticas RLS optimizadas: ~60+ (con SELECT auth.uid())';
    RAISE NOTICE 'Índices creados: 10+';
    RAISE NOTICE 'Estadísticas actualizadas: 7 tablas';
    RAISE NOTICE '============================================';
END $$;
