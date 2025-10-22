/**
 * Unit tests for workspace route helpers
 * 
 * These tests verify that the route helpers generate correct paths
 * for all locales and entity types.
 */

import { describe, it, expect } from '@jest/globals';
import {
  DEFAULT_LOCALE,
  parseLocaleFromPath,
  isValidLocale,
  normalizeLocale,
  getWorkspaceHome,
  getDashboardHome,
  pathForPolicy,
  pathForPolicies,
  pathForProposal,
  pathForProposals,
  pathForAnalysis,
  pathForAnalyses,
  pathForCase,
  pathForCases,
  pathForClient,
  pathForClients,
  pathForEntity,
  pathForEntityList,
  pathForNewEntity,
  pathForEditEntity,
} from '../workspace';

// ============================================================================
// LOCALE UTILITIES
// ============================================================================

describe('parseLocaleFromPath', () => {
  it('should extract Spanish locale from path', () => {
    expect(parseLocaleFromPath('/es/dashboard')).toBe('es');
    expect(parseLocaleFromPath('/es/workspace')).toBe('es');
    expect(parseLocaleFromPath('/es/workspace/clients')).toBe('es');
  });

  it('should extract English locale from path', () => {
    expect(parseLocaleFromPath('/en/dashboard')).toBe('en');
    expect(parseLocaleFromPath('/en/workspace')).toBe('en');
    expect(parseLocaleFromPath('/en/workspace/policies')).toBe('en');
  });

  it('should return default locale for root paths', () => {
    expect(parseLocaleFromPath('/')).toBe(DEFAULT_LOCALE);
    expect(parseLocaleFromPath('/dashboard')).toBe(DEFAULT_LOCALE);
    expect(parseLocaleFromPath('/workspace')).toBe(DEFAULT_LOCALE);
  });
});

describe('isValidLocale', () => {
  it('should validate supported locales', () => {
    expect(isValidLocale('es')).toBe(true);
    expect(isValidLocale('en')).toBe(true);
  });

  it('should reject unsupported locales', () => {
    expect(isValidLocale('fr')).toBe(false);
    expect(isValidLocale('de')).toBe(false);
    expect(isValidLocale('')).toBe(false);
  });
});

describe('normalizeLocale', () => {
  it('should return valid locales as-is', () => {
    expect(normalizeLocale('es')).toBe('es');
    expect(normalizeLocale('en')).toBe('en');
  });

  it('should return default for invalid locales', () => {
    expect(normalizeLocale('fr')).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale('invalid')).toBe(DEFAULT_LOCALE);
  });

  it('should return default for null/undefined', () => {
    expect(normalizeLocale(null)).toBe(DEFAULT_LOCALE);
    expect(normalizeLocale(undefined)).toBe(DEFAULT_LOCALE);
  });
});

// ============================================================================
// WORKSPACE & DASHBOARD PATHS
// ============================================================================

describe('getWorkspaceHome', () => {
  it('should build workspace home for Spanish', () => {
    expect(getWorkspaceHome('es')).toBe('/es/workspace');
  });

  it('should build workspace home for English', () => {
    expect(getWorkspaceHome('en')).toBe('/en/workspace');
  });

  it('should default to Spanish locale', () => {
    expect(getWorkspaceHome()).toBe('/es/workspace');
  });
});

describe('getDashboardHome', () => {
  it('should build dashboard home for Spanish', () => {
    expect(getDashboardHome('es')).toBe('/es/dashboard');
  });

  it('should build dashboard home for English', () => {
    expect(getDashboardHome('en')).toBe('/en/dashboard');
  });

  it('should default to Spanish locale', () => {
    expect(getDashboardHome()).toBe('/es/dashboard');
  });
});

// ============================================================================
// ENTITY PATHS - POLICIES
// ============================================================================

describe('pathForPolicy', () => {
  it('should build policy detail path for Spanish', () => {
    expect(pathForPolicy('pol-001', 'es')).toBe('/es/workspace/policies/pol-001');
  });

  it('should build policy detail path for English', () => {
    expect(pathForPolicy('pol-001', 'en')).toBe('/en/workspace/policies/pol-001');
  });

  it('should default to Spanish locale', () => {
    expect(pathForPolicy('pol-001')).toBe('/es/workspace/policies/pol-001');
  });
});

describe('pathForPolicies', () => {
  it('should build policies list path for Spanish', () => {
    expect(pathForPolicies('es')).toBe('/es/workspace/policies');
  });

  it('should build policies list path for English', () => {
    expect(pathForPolicies('en')).toBe('/en/workspace/policies');
  });
});

// ============================================================================
// ENTITY PATHS - PROPOSALS
// ============================================================================

describe('pathForProposal', () => {
  it('should build proposal detail path for Spanish', () => {
    expect(pathForProposal('prop-001', 'es')).toBe('/es/workspace/proposals/prop-001');
  });

  it('should build proposal detail path for English', () => {
    expect(pathForProposal('prop-001', 'en')).toBe('/en/workspace/proposals/prop-001');
  });

  it('should default to Spanish locale', () => {
    expect(pathForProposal('prop-001')).toBe('/es/workspace/proposals/prop-001');
  });
});

describe('pathForProposals', () => {
  it('should build proposals list path for Spanish', () => {
    expect(pathForProposals('es')).toBe('/es/workspace/proposals');
  });

  it('should build proposals list path for English', () => {
    expect(pathForProposals('en')).toBe('/en/workspace/proposals');
  });
});

// ============================================================================
// ENTITY PATHS - ANALYSES
// ============================================================================

describe('pathForAnalysis', () => {
  it('should build analysis detail path for Spanish', () => {
    expect(pathForAnalysis('ana-001', 'es')).toBe('/es/workspace/analysis/ana-001');
  });

  it('should build analysis detail path for English', () => {
    expect(pathForAnalysis('ana-001', 'en')).toBe('/en/workspace/analysis/ana-001');
  });
});

describe('pathForAnalyses', () => {
  it('should build analyses list path for Spanish', () => {
    expect(pathForAnalyses('es')).toBe('/es/workspace/analysis');
  });
});

// ============================================================================
// ENTITY PATHS - CASES
// ============================================================================

describe('pathForCase', () => {
  it('should build case detail path for Spanish', () => {
    expect(pathForCase('case-001', 'es')).toBe('/es/workspace/cases/case-001');
  });

  it('should build case detail path for English', () => {
    expect(pathForCase('case-001', 'en')).toBe('/en/workspace/cases/case-001');
  });
});

describe('pathForCases', () => {
  it('should build cases list path for Spanish', () => {
    expect(pathForCases('es')).toBe('/es/workspace/cases');
  });
});

// ============================================================================
// ENTITY PATHS - CLIENTS
// ============================================================================

describe('pathForClient', () => {
  it('should build client detail path for Spanish', () => {
    expect(pathForClient('cli-001', 'es')).toBe('/es/workspace/clients/cli-001');
  });

  it('should build client detail path for English', () => {
    expect(pathForClient('cli-001', 'en')).toBe('/en/workspace/clients/cli-001');
  });
});

describe('pathForClients', () => {
  it('should build clients list path for Spanish', () => {
    expect(pathForClients('es')).toBe('/es/workspace/clients');
  });
});

// ============================================================================
// GENERIC ENTITY PATHS
// ============================================================================

describe('pathForEntity', () => {
  it('should build paths for all entity types', () => {
    expect(pathForEntity('policy', 'pol-001', 'es')).toBe('/es/workspace/policies/pol-001');
    expect(pathForEntity('proposal', 'prop-001', 'es')).toBe('/es/workspace/proposals/prop-001');
    expect(pathForEntity('analysis', 'ana-001', 'es')).toBe('/es/workspace/analysis/ana-001');
    expect(pathForEntity('case', 'case-001', 'es')).toBe('/es/workspace/cases/case-001');
    expect(pathForEntity('client', 'cli-001', 'es')).toBe('/es/workspace/clients/cli-001');
  });

  it('should respect locale parameter', () => {
    expect(pathForEntity('policy', 'pol-001', 'en')).toBe('/en/workspace/policies/pol-001');
  });
});

describe('pathForEntityList', () => {
  it('should build list paths for all entity types', () => {
    expect(pathForEntityList('policy', 'es')).toBe('/es/workspace/policies');
    expect(pathForEntityList('proposal', 'es')).toBe('/es/workspace/proposals');
    expect(pathForEntityList('analysis', 'es')).toBe('/es/workspace/analysis');
    expect(pathForEntityList('case', 'es')).toBe('/es/workspace/cases');
    expect(pathForEntityList('client', 'es')).toBe('/es/workspace/clients');
  });
});

// ============================================================================
// NEW & EDIT PATHS
// ============================================================================

describe('pathForNewEntity', () => {
  it('should build new entity paths', () => {
    expect(pathForNewEntity('policy', 'es')).toBe('/es/workspace/policies/new');
    expect(pathForNewEntity('client', 'es')).toBe('/es/workspace/clients/new');
    expect(pathForNewEntity('proposal', 'en')).toBe('/en/workspace/proposals/new');
  });
});

describe('pathForEditEntity', () => {
  it('should build edit entity paths', () => {
    expect(pathForEditEntity('case', 'case-001', 'es')).toBe('/es/workspace/cases/case-001/edit');
    expect(pathForEditEntity('client', 'cli-001', 'en')).toBe('/en/workspace/clients/cli-001/edit');
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('edge cases', () => {
  it('should handle IDs with special characters', () => {
    expect(pathForClient('cli_001-abc', 'es')).toBe('/es/workspace/clients/cli_001-abc');
  });

  it('should handle long IDs', () => {
    const longId = 'pol-' + 'a'.repeat(100);
    expect(pathForPolicy(longId, 'es')).toBe(`/es/workspace/policies/${longId}`);
  });

  it('should handle empty strings gracefully', () => {
    expect(pathForClient('', 'es')).toBe('/es/workspace/clients/');
  });
});

