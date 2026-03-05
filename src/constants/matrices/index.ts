// src/constants/matrices/index.ts
/**
 * Matrix Registry — Resolves the static matrix definition for each insurance category.
 *
 * Each matrix defines the EXACT rows (coverages, clauses, notes) that MUST
 * appear in the exported Excel, organized by sections. This prevents the LLM's
 * "Lazy Generation" problem where it omits items during semantic alignment.
 *
 * To add a new category:
 *  1. Create `src/constants/matrices/{categoryId}.matrix.ts`
 *  2. Import and register it in MATRIX_REGISTRY below
 *
 * @module constants/matrices
 */

import type { MatrixDefinition } from '@/lib/excel/types';

// ─── Matrix Imports ──────────────────────────────────────────────────────────

import { TRDM_SECCIONES_EXCEL, TRDM_MATRIZ_COMPLETA } from './trdm.matrix';
import { RCE_SECCIONES_EXCEL, RCE_MATRIZ_COMPLETA } from './rce.matrix';
import { TRANSPORTE_SECCIONES_EXCEL, TRANSPORTE_MATRIZ_COMPLETA } from './transporte.matrix';
import { RIESGOS_FINANCIEROS_SECCIONES_EXCEL, RIESGOS_FINANCIEROS_MATRIZ_COMPLETA } from './riesgos-financieros.matrix';
import { FLOTA_SECCIONES_EXCEL, FLOTA_MATRIZ_COMPLETA } from './flota.matrix';
import { AUTOS_LIVIANOS_SECCIONES_EXCEL, AUTOS_LIVIANOS_MATRIZ_COMPLETA } from './autos-livianos.matrix';
import { ACCIDENTES_PERSONALES_SECCIONES_EXCEL, ACCIDENTES_PERSONALES_MATRIZ_COMPLETA } from './accidentes-personales.matrix';
import { HOGAR_SECCIONES_EXCEL, HOGAR_MATRIZ_COMPLETA } from './hogar.matrix';
import { SALUD_SECCIONES_EXCEL, SALUD_MATRIZ_COMPLETA } from './salud.matrix';
import { VIDA_SECCIONES_EXCEL, VIDA_MATRIZ_COMPLETA } from './vida.matrix';

// ─── Registry ────────────────────────────────────────────────────────────────

const MATRIX_REGISTRY: Record<string, MatrixDefinition> = {
  trdm: {
    categoryId: 'trdm',
    categoryLabel: 'Todo Riesgo Daños Materiales (TRDM)',
    secciones: TRDM_SECCIONES_EXCEL,
    matrizCompleta: TRDM_MATRIZ_COMPLETA,
  },
  rce: {
    categoryId: 'rce',
    categoryLabel: 'Responsabilidad Civil Extracontractual (RCE)',
    secciones: RCE_SECCIONES_EXCEL,
    matrizCompleta: RCE_MATRIZ_COMPLETA,
  },
  transporte: {
    categoryId: 'transporte',
    categoryLabel: 'Transporte de Mercancías',
    secciones: TRANSPORTE_SECCIONES_EXCEL,
    matrizCompleta: TRANSPORTE_MATRIZ_COMPLETA,
  },
  riesgos_financieros: {
    categoryId: 'riesgos_financieros',
    categoryLabel: 'Riesgos Financieros (D&O / Infidelidad)',
    secciones: RIESGOS_FINANCIEROS_SECCIONES_EXCEL,
    matrizCompleta: RIESGOS_FINANCIEROS_MATRIZ_COMPLETA,
  },
  flota: {
    categoryId: 'flota',
    categoryLabel: 'Flota Vehicular',
    secciones: FLOTA_SECCIONES_EXCEL,
    matrizCompleta: FLOTA_MATRIZ_COMPLETA,
  },
  vehiculos_livianos: {
    categoryId: 'vehiculos_livianos',
    categoryLabel: 'Vehículos Livianos (Autos)',
    secciones: AUTOS_LIVIANOS_SECCIONES_EXCEL,
    matrizCompleta: AUTOS_LIVIANOS_MATRIZ_COMPLETA,
  },
  accidentes_personales: {
    categoryId: 'accidentes_personales',
    categoryLabel: 'Accidentes Personales',
    secciones: ACCIDENTES_PERSONALES_SECCIONES_EXCEL,
    matrizCompleta: ACCIDENTES_PERSONALES_MATRIZ_COMPLETA,
  },
  hogar: {
    categoryId: 'hogar',
    categoryLabel: 'Hogar',
    secciones: HOGAR_SECCIONES_EXCEL,
    matrizCompleta: HOGAR_MATRIZ_COMPLETA,
  },
  salud: {
    categoryId: 'salud',
    categoryLabel: 'Salud / Medicina Prepagada',
    secciones: SALUD_SECCIONES_EXCEL,
    matrizCompleta: SALUD_MATRIZ_COMPLETA,
  },
  vida: {
    categoryId: 'vida',
    categoryLabel: 'Vida Grupo / Individual',
    secciones: VIDA_SECCIONES_EXCEL,
    matrizCompleta: VIDA_MATRIZ_COMPLETA,
  },
};

// ─── Resolver ────────────────────────────────────────────────────────────────

/**
 * Resolves the MatrixDefinition for a given insurance category.
 *
 * @param categoryId - The insurance category ID (e.g. 'trdm', 'salud')
 * @returns The MatrixDefinition or null if no matrix exists for this category
 */
export function resolveMatrixDefinition(categoryId?: string | null): MatrixDefinition | null {
  if (!categoryId) return null;
  return MATRIX_REGISTRY[categoryId] ?? null;
}

/**
 * Returns true if a static matrix definition exists for the given category.
 */
export function hasMatrixDefinition(categoryId: string): boolean {
  return categoryId in MATRIX_REGISTRY;
}

/**
 * Returns all registered category IDs that have matrix definitions.
 */
export function getMatrixCategoryIds(): string[] {
  return Object.keys(MATRIX_REGISTRY);
}
