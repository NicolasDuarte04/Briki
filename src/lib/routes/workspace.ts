// src/lib/routes/workspace.ts
/**
 * Centralized workspace route helpers
 * Provides type-safe route generation for the workspace
 */

export type Locale = 'en' | 'es';
export type EntityType = 'case' | 'policy' | 'proposal' | 'analysis' | 'client' | 'company' | 'comparison' | 'renewal';

/**
 * Safely converts a string locale from next-intl to typed Locale
 * 
 * This helper bridges the gap between next-intl's generic string type
 * and Briki's specific Locale type ('en' | 'es').
 * 
 * @param locale - String locale from useLocale() hook
 * @returns Typed Locale, falling back to 'en' if unsupported
 * 
 * @example
 * const locale = useLocale(); // returns string
 * const typedLocale = toLocale(locale); // returns 'en' | 'es'
 * const path = pathForAgent(typedLocale); // type-safe
 */
export function toLocale(locale: string): Locale {
  if (locale === 'en' || locale === 'es') {
    return locale;
  }
  // Fallback to default locale if unsupported
  console.warn(`[toLocale] Unsupported locale "${locale}", falling back to "en"`);
  return 'en';
}

/**
 * Get the landing page route
 */
export function pathForLanding(locale: Locale): string {
  return `/${locale}/landing`;
}

/**
 * Get the dashboard home route
 */
export function getDashboardHome(locale: Locale): string {
  return `/${locale}/dashboard`;
}

/**
 * Get the agent route
 */
export function pathForAgent(locale: Locale): string {
  return `/${locale}/agent/new-thread-placeholder`;
}

/**
 * Get the cases route
 */
export function pathForCases(locale: Locale): string {
  return `/${locale}/workspace/cases`;
}

/**
 * Get the clients route
 */
export function pathForClients(locale: Locale): string {
  return `/${locale}/workspace/clients`;
}

/**
 * Get the companies route
 */
export function pathForCompanies(locale: Locale): string {
  return `/${locale}/workspace/companies`;
}

/**
 * Get the profile route
 */
export function getProfilePath(locale: Locale): string {
  return `/${locale}/profile`;
}

// =============================================================================
// RUTAS DE PÓLIZAS STANDALONE (Org-level policies)
// =============================================================================

/**
 * Get the main policies dashboard route (org-level policies)
 */
export function pathForPolicies(locale: Locale): string {
  return `/${locale}/policies`;
}

/**
 * Get the policies overview/metrics route
 */
export function pathForPoliciesOverview(locale: Locale): string {
  return `/${locale}/policies/overview`;
}

/**
 * Get the policies analysis route
 */
export function pathForPoliciesAnalysis(locale: Locale): string {
  return `/${locale}/policies/analysis`;
}

/**
 * Get the policies upload route
 */
export function pathForPoliciesUpload(locale: Locale): string {
  return `/${locale}/policies/upload`;
}

/**
 * Get the policy analysis detail route (for org-level standalone policies)
 * Note: This is different from pathForPolicy which points to /workspace/policies/[id]
 */
export function pathForPolicyAnalysisDetail(policyId: string, locale: Locale): string {
  return `/${locale}/policies/analysis/${policyId}`;
}

// =============================================================================
// RUTAS DE COTIZACIONES STANDALONE (Org-level quotes)
// =============================================================================

/**
 * Get the main quotes dashboard route (org-level quotes)
 */
export function pathForQuotes(locale: Locale): string {
  return `/${locale}/quotes`;
}

/**
 * Get the quotes overview/metrics route
 */
export function pathForQuotesOverview(locale: Locale): string {
  return `/${locale}/quotes/overview`;
}

/**
 * Get the quotes analysis route
 */
export function pathForQuotesAnalysis(locale: Locale): string {
  return `/${locale}/quotes/analysis`;
}

/**
 * Get the quotes upload route
 */
export function pathForQuotesUpload(locale: Locale): string {
  return `/${locale}/quotes/upload`;
}

/**
 * Get the quote analysis detail route (for org-level standalone quotes)
 */
export function pathForQuoteAnalysisDetail(quoteId: string, locale: Locale): string {
  return `/${locale}/quotes/analysis/${quoteId}`;
}

/**
 * Get the login route
 */
export function pathForLogin(locale: Locale): string {
  return `/${locale}/login`;
}

/**
 * Get the contact route
 */
export function pathForContact(locale: Locale): string {
  return `/${locale}/contact`;
}

/**
 * Get route for a specific entity by type and ID
 */
export function pathForEntity(type: EntityType, id: string, locale: Locale): string {
  const basePath = `/${locale}/workspace`;
  
  switch (type) {
    case 'case':
      return `${basePath}/cases/${id}`;
    case 'policy':
      return `${basePath}/policies/${id}`;
    case 'proposal':
      return `${basePath}/proposals/${id}`;
    case 'analysis':
      return `${basePath}/analyses/${id}`;
    case 'client':
      return `${basePath}/clients/${id}`;
    case 'comparison':
      return `${basePath}/comparisons/${id}`;
    case 'renewal':
      return `${basePath}/renewals/${id}`;
    default:
      return `${basePath}/cases/${id}`;
  }
}

/**
 * Get route for creating a new entity
 */
export function pathForNewEntity(type: EntityType, locale: Locale): string {
  const basePath = `/${locale}/workspace`;
  
  switch (type) {
    case 'case':
      // Los casos se crean exclusivamente desde el agente IA
      return `/${locale}/agent/new-thread-placeholder`;
    case 'policy':
      return `${basePath}/policies/new`;
    case 'proposal':
      return `${basePath}/proposals/new`;
    case 'analysis':
      return `${basePath}/analyses/new`;
    case 'client':
      return `${basePath}/clients/new`;
    case 'comparison':
      return `${basePath}/comparisons/new`;
    case 'renewal':
      return `${basePath}/renewals/new`;
    default:
      // Por defecto, redirigir al agente para creación de casos
      return `/${locale}/agent/new-thread-placeholder`;
  }
}

/**
 * Get route for a specific client
 */
export function pathForClient(clientId: string, locale: Locale): string {
  return `/${locale}/workspace/clients/${clientId}`;
}

/**
 * Get route for a case with a specific action
 */
export function pathForCaseWithAction(caseId: string, action: string, locale: Locale): string {
  return `/${locale}/workspace/cases/${caseId}?action=${action}`;
}

/**
 * Get route for a specific analysis
 */
export function pathForAnalysis(analysisId: string, locale: Locale): string {
  return `/${locale}/workspace/analyses/${analysisId}`;
}

/**
 * Get route for a specific proposal
 */
export function pathForProposal(proposalId: string, locale: Locale): string {
  return `/${locale}/workspace/proposals/${proposalId}`;
}

/**
 * Get route for a specific policy
 */
export function pathForPolicy(policyId: string, locale: Locale): string {
  return `/${locale}/workspace/policies/${policyId}`;
}

/**
 * Get route for a specific comparison
 */
export function pathForComparison(comparisonId: string, locale: Locale): string {
  return `/${locale}/workspace/comparisons/${comparisonId}`;
}

/**
 * Get route for a specific renewal
 */
export function pathForRenewal(renewalId: string, locale: Locale): string {
  return `/${locale}/workspace/renewals/${renewalId}`;
}

/**
 * Check if a path matches the current route
 */
export function matchPath(pathname: string, targetPath: string): boolean {
  return pathname === targetPath || pathname.startsWith(targetPath + '/');
}

