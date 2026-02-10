-- ============================================================================
-- MIGRACIÓN: Añadir soporte para Empresa (Company) en Case
-- Fecha: 2026-02-09
-- Descripción: Permite seleccionar entre Cliente (persona física) o Empresa 
--              (persona jurídica) como sujeto del caso
-- ============================================================================

-- ============================================================================
-- PASO 1: Añadir nuevas columnas a la tabla cases
-- ============================================================================

-- Campo para identificar el tipo de sujeto: 'client' (persona física) o 'company' (persona jurídica)
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS subject_type VARCHAR(20) DEFAULT 'client';

-- FK a la tabla companies para casos de personas jurídicas
ALTER TABLE public.cases 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- ============================================================================
-- PASO 2: Añadir Foreign Key constraint
-- ============================================================================

-- Verificar si la constraint ya existe antes de añadirla
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'cases_company_id_fkey'
    ) THEN
        ALTER TABLE public.cases 
        ADD CONSTRAINT cases_company_id_fkey 
        FOREIGN KEY (company_id) 
        REFERENCES public.companies(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- PASO 3: Crear índices para optimización de consultas
-- ============================================================================

-- Índice para búsquedas por company_id
CREATE INDEX IF NOT EXISTS idx_cases_company_id ON public.cases(company_id);

-- Índice para filtrado por subject_type
CREATE INDEX IF NOT EXISTS idx_cases_subject_type ON public.cases(subject_type);

-- ============================================================================
-- PASO 4: Actualizar casos existentes (migración de datos)
-- ============================================================================

-- Todos los casos existentes son de tipo 'client' por defecto
-- (ya que antes no existía el concepto de empresa)
UPDATE public.cases 
SET subject_type = 'client' 
WHERE subject_type IS NULL;

-- ============================================================================
-- PASO 5: Añadir constraint CHECK para validar valores de subject_type
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'cases_subject_type_check'
    ) THEN
        ALTER TABLE public.cases 
        ADD CONSTRAINT cases_subject_type_check 
        CHECK (subject_type IN ('client', 'company'));
    END IF;
END $$;

-- ============================================================================
-- PASO 6: Añadir constraint para exclusividad mutua (opcional pero recomendado)
-- ============================================================================

-- Asegurar que si subject_type = 'company', client_id sea NULL y viceversa
-- NOTA: Comentado por ahora para permitir migración gradual de datos
-- Descomentar después de verificar que la aplicación funciona correctamente

-- DO $$
-- BEGIN
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_constraint 
--         WHERE conname = 'cases_subject_exclusivity_check'
--     ) THEN
--         ALTER TABLE public.cases 
--         ADD CONSTRAINT cases_subject_exclusivity_check 
--         CHECK (
--             (subject_type = 'client' AND company_id IS NULL) OR
--             (subject_type = 'company' AND client_id IS NULL) OR
--             (subject_type = 'client' AND client_id IS NULL AND company_id IS NULL) -- Permitir caso sin sujeto
--         );
--     END IF;
-- END $$;

-- ============================================================================
-- VERIFICACIÓN
-- ============================================================================

-- Verificar que las columnas fueron añadidas
DO $$
DECLARE
    subject_type_exists BOOLEAN;
    company_id_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'subject_type'
    ) INTO subject_type_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cases' 
        AND column_name = 'company_id'
    ) INTO company_id_exists;
    
    IF subject_type_exists AND company_id_exists THEN
        RAISE NOTICE '✅ Migración completada exitosamente: subject_type y company_id añadidos a cases';
    ELSE
        RAISE EXCEPTION '❌ Error en migración: columnas no encontradas';
    END IF;
END $$;

-- ============================================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================

COMMENT ON COLUMN public.cases.subject_type IS 'Tipo de sujeto del caso: client (persona física) o company (persona jurídica)';
COMMENT ON COLUMN public.cases.company_id IS 'FK a companies - solo aplica cuando subject_type = company';
