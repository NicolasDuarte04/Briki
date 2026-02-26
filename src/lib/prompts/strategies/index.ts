// src/lib/prompts/strategies/index.ts
/**
 * Strategy Registry — Dispatcher for the Category Strategy Pattern.
 *
 * Resolves the correct `CategoryStrategy` for a given insurance category.
 * When a dedicated `.strategy.ts` exists, it takes precedence.
 * Otherwise, `GenericStrategy` handles the fallback using heuristics.
 *
 * To register a new specific strategy:
 *  1. Create `strategies/<categoryId>.strategy.ts` implementing CategoryStrategy
 *  2. Import and add it to STRATEGY_REGISTRY below
 *  3. The prompt engine picks it up automatically
 *
 * @module prompts/strategies
 */

import type { CategoryStrategy } from './types';
import { GenericStrategy } from './generic.strategy';
import { TrdmStrategy } from './trdm.strategy';
import { RceStrategy } from './rce.strategy';
import { TransporteStrategy } from './transporte.strategy';
import { RiesgosFinancierosStrategy } from './riesgos-financieros.strategy';
import { FlotaStrategy } from './flota.strategy';
import { AutosLivianosStrategy } from './autos-livianos.strategy';
import { AccidentesPersonalesStrategy } from './accidentes-personales.strategy';
import { HogarStrategy } from './hogar.strategy';
import { SaludStrategy } from './salud.strategy';
import { VidaStrategy } from './vida.strategy';

// ─── Strategy Registry ───────────────────────────────────────────────────────

/**
 * Map of categoryId → factory function returning its CategoryStrategy.
 *
 * IMPORTANT: Specific strategies are added here as the user provides
 * the domain ontology for each insurance category. Until then,
 * the GenericStrategy is the universal fallback.
 *
 * Example future entry:
 *   trdm: () => new TrdmStrategy(),
 */
const STRATEGY_REGISTRY: Record<string, () => CategoryStrategy> = {
  // ── Specific strategies ──
  trdm: () => new TrdmStrategy(),
  rce: () => new RceStrategy(),
  transporte: () => new TransporteStrategy(),
  riesgos_financieros: () => new RiesgosFinancierosStrategy(),
  flota: () => new FlotaStrategy(),
  vehiculos_livianos: () => new AutosLivianosStrategy(),
  accidentes_personales: () => new AccidentesPersonalesStrategy(),
  hogar: () => new HogarStrategy(),
  salud: () => new SaludStrategy(),
  vida: () => new VidaStrategy(),
};

// ─── Strategy Cache (singleton per category per process lifecycle) ────────────

const strategyCache = new Map<string, CategoryStrategy>();

// ─── Resolver ────────────────────────────────────────────────────────────────

/**
 * Resolves the most appropriate CategoryStrategy for the given category.
 *
 * Resolution order:
 *  1. Cached instance (if previously resolved in this process)
 *  2. Specific strategy from STRATEGY_REGISTRY
 *  3. GenericStrategy instantiated with the categoryId (reads CATEGORY_DEFINITIONS)
 *
 * @param categoryId - The insurance category from the case brief (e.g. 'trdm', 'salud')
 * @returns          - The resolved CategoryStrategy (never null)
 */
export function resolveStrategy(categoryId?: string | null): CategoryStrategy {
  const key = categoryId ?? 'generic';

  // Check cache
  const cached = strategyCache.get(key);
  if (cached) return cached;

  // Check registry for specific strategy
  const factory = STRATEGY_REGISTRY[key];
  const strategy = factory ? factory() : new GenericStrategy(key === 'generic' ? undefined : key);

  strategyCache.set(key, strategy);
  return strategy;
}

/**
 * Returns true if the given category has a dedicated specific strategy
 * (as opposed to falling back to GenericStrategy).
 */
export function hasSpecificStrategy(categoryId: string): boolean {
  return categoryId in STRATEGY_REGISTRY;
}

/**
 * Clears the strategy cache. Useful for testing.
 * @internal
 */
export function clearStrategyCache(): void {
  strategyCache.clear();
}

// ── Re-exports for convenience ───────────────────────────────────────────────

export type { CategoryStrategy, FieldLabelMap, PiiClassification } from './types';
export { ANALYSIS_REASON_CONTEXTS } from './types';
export { GenericStrategy } from './generic.strategy';
export { sanitizeCategoryData } from './pii-sanitizer';
export { serializeBriefDataToYaml, summarizeBriefData } from './yaml-serializer';
