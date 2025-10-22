/**
 * Workspace Route Helpers
 * 
 * Single source of truth for locale-aware workspace paths.
 * Pure functions with no framework dependencies for easy testing.
 * 
 * @module routes/workspace
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Supported locales in the application
 */
export type Locale = 'en' | 'es';

/**
 * Entity types in the workspace
 */
export type EntityType = 'policy' | 'proposal' | 'analysis' | 'case' | 'client' | 'comparison';

/**
 * Organization identifier for future multi-org support
 */
export type OrgId = string;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Default locale when none is specified
 */
export const DEFAULT_LOCALE: Locale = 'es';

/**
 * All supported locales
 */
export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'es'] as const;

/**
 * Workspace root segment
 */
const WORKSPACE_ROOT = '/workspace';

/**
 * Entity path segments mapped by entity type
 */
const ENTITY_SEGMENTS: Record<EntityType, string> = {
  policy: 'policies',
  proposal: 'proposals',
  analysis: 'analysis',
  case: 'cases',
  client: 'clients',
  comparison: 'comparisons',
} as const;

// ============================================================================
// LOCALE UTILITIES
// ============================================================================

/**
 * Parses locale from a pathname
 * 
 * @param pathname - URL pathname to parse (e.g., "/es/dashboard", "/en/workspace")
 * @returns Extracted locale or default locale if not found
 * 
 * @example
 * ```ts
 * parseLocaleFromPath('/es/dashboard') // => 'es'
 * parseLocaleFromPath('/en/workspace') // => 'en'
 * parseLocaleFromPath('/dashboard')    // => 'es' (default)
 * parseLocaleFromPath('/')             // => 'es' (default)
 * ```
 */
export function parseLocaleFromPath(pathname: string): Locale {
  const match = pathname.match(/^\/(es|en)/);
  return match ? (match[1] as Locale) : DEFAULT_LOCALE;
}

/**
 * Checks if a string is a valid locale
 * 
 * @param locale - String to validate
 * @returns True if locale is supported
 * 
 * @example
 * ```ts
 * isValidLocale('es') // => true
 * isValidLocale('fr') // => false
 * ```
 */
export function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

/**
 * Normalizes a locale string, returning default if invalid
 * 
 * @param locale - Locale string to normalize
 * @returns Valid locale or default locale
 * 
 * @example
 * ```ts
 * normalizeLocale('es')  // => 'es'
 * normalizeLocale('fr')  // => 'es' (default)
 * normalizeLocale(undefined) // => 'es' (default)
 * ```
 */
export function normalizeLocale(locale?: string | null): Locale {
  if (!locale) return DEFAULT_LOCALE;
  return isValidLocale(locale) ? locale : DEFAULT_LOCALE;
}

// ============================================================================
// PATH BUILDERS - WORKSPACE
// ============================================================================

/**
 * Builds the workspace home path for a given locale
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware workspace home path
 * 
 * @example
 * ```ts
 * getWorkspaceHome('es')    // => '/es/workspace'
 * getWorkspaceHome('en')    // => '/en/workspace'
 * getWorkspaceHome()        // => '/es/workspace' (default)
 * ```
 */
export function getWorkspaceHome(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}`;
}

/**
 * Builds the dashboard home path for a given locale
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware dashboard path
 * 
 * @example
 * ```ts
 * getDashboardHome('es')  // => '/es/dashboard'
 * getDashboardHome('en')  // => '/en/dashboard'
 * ```
 */
export function getDashboardHome(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}/dashboard`;
}

/**
 * Builds the profile path for a given locale
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware profile path
 * 
 * @example
 * ```ts
 * getProfilePath('es')  // => '/es/profile'
 * getProfilePath('en')  // => '/en/profile'
 * ```
 */
export function getProfilePath(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}/profile`;
}

/**
 * Builds the agent path for a given locale
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware agent path
 * 
 * @example
 * ```ts
 * pathForAgent('es')  // => '/es/agent'
 * pathForAgent('en')  // => '/en/agent'
 * ```
 */
export function pathForAgent(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}/agent`;
}

/**
 * Builds the agent thread path for a specific thread/case
 * 
 * @param threadId - Thread/Case ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware agent thread path
 * 
 * @example
 * ```ts
 * pathForAgentThread('case-001', 'es')  // => '/es/agent/case-001'
 * pathForAgentThread('case-001')        // => '/es/agent/case-001'
 * ```
 */
export function pathForAgentThread(threadId: string, locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}/agent/${threadId}`;
}

// ============================================================================
// PATH BUILDERS - ENTITIES
// ============================================================================

/**
 * Builds a path for a policy
 * 
 * @param id - Policy ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware policy detail path
 * 
 * @example
 * ```ts
 * pathForPolicy('pol-001', 'es')  // => '/es/workspace/policies/pol-001'
 * pathForPolicy('pol-001')        // => '/es/workspace/policies/pol-001'
 * ```
 */
export function pathForPolicy(id: string, locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.policy}/${id}`;
}

/**
 * Builds a list path for all policies
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware policies list path
 * 
 * @example
 * ```ts
 * pathForPolicies('es')  // => '/es/workspace/policies'
 * pathForPolicies()      // => '/es/workspace/policies'
 * ```
 */
export function pathForPolicies(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.policy}`;
}

/**
 * Builds a path for a proposal
 * 
 * @param id - Proposal ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware proposal detail path
 * 
 * @example
 * ```ts
 * pathForProposal('prop-001', 'es')  // => '/es/workspace/proposals/prop-001'
 * pathForProposal('prop-001')        // => '/es/workspace/proposals/prop-001'
 * ```
 */
export function pathForProposal(id: string, locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.proposal}/${id}`;
}

/**
 * Builds a list path for all proposals
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware proposals list path
 * 
 * @example
 * ```ts
 * pathForProposals('es')  // => '/es/workspace/proposals'
 * pathForProposals()      // => '/es/workspace/proposals'
 * ```
 */
export function pathForProposals(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.proposal}`;
}

/**
 * Builds a path for an analysis
 * 
 * @param id - Analysis ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware analysis detail path
 * 
 * @example
 * ```ts
 * pathForAnalysis('ana-001', 'es')  // => '/es/workspace/analysis/ana-001'
 * pathForAnalysis('ana-001')        // => '/es/workspace/analysis/ana-001'
 * ```
 */
export function pathForAnalysis(id: string, locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.analysis}/${id}`;
}

/**
 * Builds a list path for all analyses
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware analyses list path
 * 
 * @example
 * ```ts
 * pathForAnalyses('es')  // => '/es/workspace/analysis'
 * pathForAnalyses()      // => '/es/workspace/analysis'
 * ```
 */
export function pathForAnalyses(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.analysis}`;
}

/**
 * Builds a path for a case
 * 
 * @param id - Case ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware case detail path
 * 
 * @example
 * ```ts
 * pathForCase('case-001', 'es')  // => '/es/workspace/cases/case-001'
 * pathForCase('case-001')        // => '/es/workspace/cases/case-001'
 * ```
 */
export function pathForCase(id: string, locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.case}/${id}`;
}

/**
 * Builds a list path for all cases
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware cases list path
 * 
 * @example
 * ```ts
 * pathForCases('es')  // => '/es/workspace/cases'
 * pathForCases()      // => '/es/workspace/cases'
 * ```
 */
export function pathForCases(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.case}`;
}

/**
 * Builds a path for a case with an action query parameter
 * 
 * @param id - Case ID
 * @param action - Action to perform on the case (e.g., 'renewal', 'review')
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware case detail path with action query param
 * 
 * @example
 * ```ts
 * pathForCaseWithAction('case-001', 'renewal', 'es')  // => '/es/workspace/cases/case-001?action=renewal'
 * pathForCaseWithAction('case-002', 'review')         // => '/es/workspace/cases/case-002?action=review'
 * ```
 */
export function pathForCaseWithAction(
  id: string,
  action: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return `${pathForCase(id, locale)}?action=${encodeURIComponent(action)}`;
}

/**
 * Builds a path for a client
 * 
 * @param id - Client ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware client detail path
 * 
 * @example
 * ```ts
 * pathForClient('cli-001', 'es')  // => '/es/workspace/clients/cli-001'
 * pathForClient('cli-001')        // => '/es/workspace/clients/cli-001'
 * ```
 */
export function pathForClient(id: string, locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.client}/${id}`;
}

/**
 * Builds a list path for all clients
 * 
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware clients list path
 * 
 * @example
 * ```ts
 * pathForClients('es')  // => '/es/workspace/clients'
 * pathForClients()      // => '/es/workspace/clients'
 * ```
 */
export function pathForClients(locale: Locale = DEFAULT_LOCALE): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS.client}`;
}

// ============================================================================
// GENERIC ENTITY PATH BUILDER
// ============================================================================

/**
 * Builds a path for any entity type (generic helper)
 * 
 * @param entityType - Type of entity
 * @param id - Entity ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware entity path
 * 
 * @example
 * ```ts
 * pathForEntity('policy', 'pol-001', 'es')     // => '/es/workspace/policies/pol-001'
 * pathForEntity('client', 'cli-001')           // => '/es/workspace/clients/cli-001'
 * pathForEntity('proposal', 'prop-001', 'en')  // => '/en/workspace/proposals/prop-001'
 * ```
 */
export function pathForEntity(
  entityType: EntityType,
  id: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS[entityType]}/${id}`;
}

/**
 * Builds a list path for any entity type (generic helper)
 * 
 * @param entityType - Type of entity
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware entity list path
 * 
 * @example
 * ```ts
 * pathForEntityList('policy', 'es')    // => '/es/workspace/policies'
 * pathForEntityList('client')          // => '/es/workspace/clients'
 * pathForEntityList('proposal', 'en')  // => '/en/workspace/proposals'
 * ```
 */
export function pathForEntityList(
  entityType: EntityType,
  locale: Locale = DEFAULT_LOCALE
): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS[entityType]}`;
}

// ============================================================================
// NEW ENTITY PATHS
// ============================================================================

/**
 * Builds a "new" path for creating an entity
 * 
 * @param entityType - Type of entity to create
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware entity creation path
 * 
 * @example
 * ```ts
 * pathForNewEntity('policy', 'es')    // => '/es/workspace/policies/new'
 * pathForNewEntity('client')          // => '/es/workspace/clients/new'
 * pathForNewEntity('proposal', 'en')  // => '/en/workspace/proposals/new'
 * ```
 */
export function pathForNewEntity(
  entityType: EntityType,
  locale: Locale = DEFAULT_LOCALE
): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS[entityType]}/new`;
}

// ============================================================================
// EDIT PATHS
// ============================================================================

/**
 * Builds an edit path for an entity
 * 
 * @param entityType - Type of entity
 * @param id - Entity ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale-aware entity edit path
 * 
 * @example
 * ```ts
 * pathForEditEntity('case', 'case-001', 'es')  // => '/es/workspace/cases/case-001/edit'
 * pathForEditEntity('client', 'cli-001')       // => '/es/workspace/clients/cli-001/edit'
 * ```
 */
export function pathForEditEntity(
  entityType: EntityType,
  id: string,
  locale: Locale = DEFAULT_LOCALE
): string {
  return `/${locale}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS[entityType]}/${id}/edit`;
}

// ============================================================================
// FUTURE: MULTI-ORG SUPPORT
// ============================================================================
// When implementing multi-org support, uncomment and use these helpers:

/**
 * Builds workspace home with org context (for future multi-org support)
 * 
 * @param orgId - Organization identifier
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale and org-aware workspace path
 * 
 * @example
 * ```ts
 * // getWorkspaceHomeWithOrg('acme-corp', 'es')  // => '/es/acme-corp/workspace'
 * // getWorkspaceHomeWithOrg('tech-inc', 'en')   // => '/en/tech-inc/workspace'
 * ```
 */
// export function getWorkspaceHomeWithOrg(
//   orgId: OrgId,
//   locale: Locale = DEFAULT_LOCALE
// ): string {
//   return `/${locale}/${orgId}${WORKSPACE_ROOT}`;
// }

/**
 * Builds entity path with org context (for future multi-org support)
 * 
 * @param orgId - Organization identifier
 * @param entityType - Type of entity
 * @param id - Entity ID
 * @param locale - Target locale (defaults to DEFAULT_LOCALE)
 * @returns Locale and org-aware entity path
 * 
 * @example
 * ```ts
 * // pathForEntityWithOrg('acme-corp', 'policy', 'pol-001', 'es')
 * // => '/es/acme-corp/workspace/policies/pol-001'
 * ```
 */
// export function pathForEntityWithOrg(
//   orgId: OrgId,
//   entityType: EntityType,
//   id: string,
//   locale: Locale = DEFAULT_LOCALE
// ): string {
//   return `/${locale}/${orgId}${WORKSPACE_ROOT}/${ENTITY_SEGMENTS[entityType]}/${id}`;
// }

