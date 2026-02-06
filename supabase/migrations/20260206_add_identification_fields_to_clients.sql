-- =====================================================
-- MIGRACIÓN: AGREGAR CAMPOS DE IDENTIFICACIÓN A CLIENTES
-- Fecha: 2026-02-06
-- Descripción: Agrega tipo de identificación, número de identificación (cifrado)
--              y país emisor del documento a la tabla clients.
-- =====================================================

-- =====================================================
-- PASO 1: AGREGAR NUEVAS COLUMNAS
-- =====================================================

-- Tipo de identificación (no cifrado - es un valor de catálogo)
-- Valores esperados: CC (Cédula de Ciudadanía), NIT, CE (Cédula de Extranjería), 
--                    PASSPORT, TI (Tarjeta de Identidad), RUT, DNI, RFC, etc.
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS id_type VARCHAR(50);

-- Número de identificación (CIFRADO con pgcrypto - es PII)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS id_number_enc BYTEA;

-- País emisor del documento (no cifrado - código ISO 3166-1 alpha-2)
-- Ejemplos: CO (Colombia), MX (México), US (Estados Unidos), ES (España)
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS id_country VARCHAR(3);

-- =====================================================
-- PASO 2: CREAR ÍNDICE PARA FILTROS POR TIPO
-- =====================================================

-- Índice para optimizar consultas filtradas por tipo de documento
-- NOTA: Removido CONCURRENTLY porque no funciona en transacciones de Supabase Dashboard
CREATE INDEX IF NOT EXISTS idx_clients_id_type 
ON public.clients(id_type);

-- =====================================================
-- PASO 3: COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON COLUMN public.clients.id_type IS 
    'Tipo de documento de identificación: CC, NIT, CE, PASSPORT, TI, RUT, DNI, RFC, OTHER';

COMMENT ON COLUMN public.clients.id_number_enc IS 
    'Número de identificación cifrado con pgcrypto. Usar encrypt_pii()/decrypt_pii()';

COMMENT ON COLUMN public.clients.id_country IS 
    'Código ISO 3166-1 alpha-2 del país emisor del documento (ej: CO, MX, US)';

-- =====================================================
-- NOTA DE SEGURIDAD
-- =====================================================
-- Las políticas RLS existentes en la tabla clients ya protegen estos nuevos campos
-- ya que operan a nivel de fila completa usando org_id.
-- NO se requieren nuevas políticas RLS.
-- 
-- Políticas existentes que protegen los nuevos campos:
-- - clients_org_isolation_select (SELECT)
-- - clients_org_isolation_insert (INSERT)  
-- - clients_org_isolation_update (UPDATE - solo admin/owner)
-- - clients_org_isolation_delete (DELETE - solo admin)
-- =====================================================
