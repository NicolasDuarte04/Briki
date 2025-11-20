-- =====================================================
-- MIGRACIÓN COMPLETA: ORGANIZACIONES Y MULTI-TENANCY
-- Objetivo: Establecer arquitectura multi-tenant completa
-- Fecha: 2025-10-11
-- =====================================================

-- Habilitar extensión pgcrypto para cifrado PII
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- TABLA ORGANIZATIONS
-- =====================================================
CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text UNIQUE NOT NULL,
    settings jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Comentarios para documentación
COMMENT ON TABLE public.organizations IS 'Organizaciones multi-tenant del sistema';
COMMENT ON COLUMN public.organizations.name IS 'Nombre de la organización';
COMMENT ON COLUMN public.organizations.slug IS 'Identificador único URL-friendly';
COMMENT ON COLUMN public.organizations.settings IS 'Configuraciones específicas de la organización';

-- =====================================================
-- TABLA ORG_MEMBERS (Membresías)
-- =====================================================
CREATE TABLE public.org_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(org_id, user_id)
);

-- Comentarios para documentación
COMMENT ON TABLE public.org_members IS 'Membresías de usuarios en organizaciones';
COMMENT ON COLUMN public.org_members.role IS 'Rol del usuario: owner, admin, member';

-- =====================================================
-- TABLA CLIENTS (Con cifrado PII)
-- =====================================================
CREATE TABLE public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name_enc bytea NOT NULL, -- Nombre cifrado
    email_enc bytea, -- Email cifrado
    phone_enc bytea, -- Teléfono cifrado
    address_enc bytea, -- Dirección cifrada
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Comentarios para documentación
COMMENT ON TABLE public.clients IS 'Clientes con datos PII cifrados';
COMMENT ON COLUMN public.clients.name_enc IS 'Nombre del cliente cifrado con pgcrypto';
COMMENT ON COLUMN public.clients.email_enc IS 'Email del cliente cifrado con pgcrypto';
COMMENT ON COLUMN public.clients.phone_enc IS 'Teléfono del cliente cifrado con pgcrypto';
COMMENT ON COLUMN public.clients.address_enc IS 'Dirección del cliente cifrada con pgcrypto';

-- =====================================================
-- FUNCIONES DE CIFRADO/DESCIFRADO
-- =====================================================

-- Función para cifrar datos PII
CREATE OR REPLACE FUNCTION public.encrypt_pii(data text)
RETURNS bytea AS $$
BEGIN
    IF data IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para descifrar datos PII
CREATE OR REPLACE FUNCTION public.decrypt_pii(data bytea)
RETURNS text AS $$
BEGIN
    IF data IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_decrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

-- Trigger para organizations
CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para org_members
CREATE TRIGGER update_org_members_updated_at 
    BEFORE UPDATE ON public.org_members
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para clients
CREATE TRIGGER update_clients_updated_at 
    BEFORE UPDATE ON public.clients
    FOR EACH ROW 
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- ÍNDICES DE PERFORMANCE
-- =====================================================

-- Índices para organizations
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- Índices para org_members
CREATE INDEX idx_org_members_org_id ON public.org_members(org_id);
CREATE INDEX idx_org_members_user_id ON public.org_members(user_id);
CREATE INDEX idx_org_members_role ON public.org_members(role);

-- Índices para clients
CREATE INDEX idx_clients_org_id ON public.clients(org_id);
CREATE INDEX idx_clients_created_at ON public.clients(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas para organizations
CREATE POLICY "org_members_can_view_org" 
    ON public.organizations FOR ALL 
    USING (id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- Políticas para org_members
CREATE POLICY "users_can_view_own_memberships" 
    ON public.org_members FOR ALL 
    USING (user_id = auth.uid());

-- Políticas para clients
CREATE POLICY "org_members_can_view_clients" 
    ON public.clients FOR ALL 
    USING (org_id IN (
        SELECT org_id FROM public.org_members 
        WHERE user_id = auth.uid()
    ));

-- =====================================================
-- DATOS DE PRUEBA (SEEDS)
-- =====================================================

-- Crear organización de desarrollo
INSERT INTO public.organizations (id, name, slug, settings) 
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Briki Development Org',
    'briki-dev',
    '{"features": {"pdf_processing": true, "ai_analysis": true}}'
);

-- Nota: Los usuarios y membresías se crearán cuando tengamos usuarios reales
