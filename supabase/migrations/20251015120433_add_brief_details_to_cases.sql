-- MIGRATION: Añadir campos detallados del Brief a la tabla de Casos
-- Objetivo: Extender la tabla 'cases' para soportar el nuevo formulario de creación
-- de casos, incluyendo campos para categoría, presupuesto y coberturas.
-- Fecha: 2025-10-15

BEGIN;

-- Añadir nuevas columnas a la tabla public.cases
ALTER TABLE public.cases
    ADD COLUMN IF NOT EXISTS insurance_category TEXT,
    ADD COLUMN IF NOT EXISTS max_budget NUMERIC,
    ADD COLUMN IF NOT EXISTS budget_currency VARCHAR(3) DEFAULT 'COP' CHECK (budget_currency IN ('COP', 'USD')),
    ADD COLUMN IF NOT EXISTS required_coverages TEXT[] DEFAULT '{}', -- Un array de strings para las coberturas
    ADD COLUMN IF NOT EXISTS client_profile TEXT;

-- Añadir comentarios para documentación y claridad futura
COMMENT ON COLUMN public.cases.insurance_category IS 'Categoría principal del seguro solicitado (ej. Salud, Vida, Auto).';
COMMENT ON COLUMN public.cases.max_budget IS 'Presupuesto máximo mensual que el cliente está dispuesto a pagar.';
COMMENT ON COLUMN public.cases.budget_currency IS 'Moneda del presupuesto (COP o USD).';
COMMENT ON COLUMN public.cases.required_coverages IS 'Lista de coberturas que el cliente considera imprescindibles.';
COMMENT ON COLUMN public.cases.client_profile IS 'Descripción detallada del perfil del cliente para personalizar recomendaciones.';

-- NOTA: Las políticas de RLS existentes para la tabla 'cases' se aplican automáticamente
-- a estas nuevas columnas, por lo que no se requieren cambios de seguridad adicionales.

COMMIT;
