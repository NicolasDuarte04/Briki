/**
 * Briki Domain Model Type Definitions
 *
 * This file contains the authoritative domain model surface for Phase 2.
 * All domain entities are defined here with strict typing, no any types,
 * explicit unions, ISO dates, and consistent money representation.
 */

import type {
  BrokerProfileParsed,
  CaseParsed,
  EligibilityParsed,
  PolicyParsed,
  PricingBandParsed,
  ProductParsed,
  ProposalMathCheckParsed,
  ProposalParsed,
  ProposalSelectedPlanParsed,
  ProvenanceParsed,
  RiderParsed,
  RenewalRecordParsed,
} from "./validation";

// ============================================================================
// Currency & Money Types
// ============================================================================

/**
 * Supported currency codes in the system
 */
export type CurrencyCode = 'COP' | 'USD' | 'MXN' | 'EUR';

/**
 * Money representation using minor units (cents)
 * @example { amountMinor: 150000, currency: 'USD' } represents $1,500.00
 */
export interface Money {
  /** Amount in minor units (e.g., cents). Must be >= 0 */
  amountMinor: number;
  /** Currency code */
  currency: CurrencyCode;
}

// ============================================================================
// Enumeration Types
// ============================================================================

/**
 * Network level for healthcare plans
 */
export type NetworkLevel = 'basic' | 'preferred' | 'concierge';

/**
 * Service level for healthcare plans
 */
export type ServiceLevel = 'standard' | 'enhanced' | 'white-glove';

/**
 * Policy status in the system
 */
export type PolicyStatus = 'draft' | 'active' | 'suspended' | 'expired' | 'cancelled';

/**
 * Rider type categories
 */
export type RiderType = 'health' | 'dental' | 'vision' | 'life' | 'disability' | 'wellness' | 'travel' | 'cyber';

/**
 * Coverage kinds
 */
export type CoverageKind = 'individual' | 'family' | 'group' | 'enterprise';

/**
 * Distribution channels
 */
export type Channel = 'direct' | 'broker' | 'agent' | 'marketplace' | 'api';

/**
 * Renewal status
 */
export type RenewalStatus = 'ok' | 'dueSoon' | 'overdue';

/**
 * Renewal window days
 */
export type RenewalWindowDays = 30 | 60 | 90;

/**
 * Comparison playbook types
 */
export type ComparisonPlaybook = 'sme' | 'hnwi' | 'auto' | 'travel';

/**
 * Audit event types
 */
export type AuditEventType = 
  | 'ComplianceOpen'
  | 'ChecklistToggle'
  | 'CompliancePass'
  | 'SendAttempt'
  | 'SendBlocked'
  | 'SendSuccess'
  | 'RenewalsViewOpen'
  | 'FilterChange'
  | 'SortChange'
  | 'NudgeQuote'
  | 'NudgeMessage'
  | 'ReminderOpen'
  | 'ReminderSet'
  | 'FollowupCadenceChanged';

/**
 * Pricing band types
 */
export type PricingBandType = 'standard' | 'preferred' | 'premium' | 'custom';

/**
 * Jurisdiction codes
 */
export type JurisdictionCode = 'co' | 'mx' | 'cl' | 'br';

/**
 * Share channels
 */
export type ShareChannel = 'whatsapp' | 'email';

/**
 * UI workflow steps
 */
export type UIStep = 
  | 'landing'
  | 'conversation'
  | 'sourcing'
  | 'normalized'
  | 'comparison'
  | 'proposal'
  | 'compliance'
  | 'followups';

// ============================================================================
// Data Layer Entities
// ============================================================================

/**
 * Represents a product offered by a carrier
 */
export type Product = ProductParsed;

/**
 * Represents an insurance carrier
 */
export interface Carrier {
  /** Unique identifier */
  id: string;
  /** Carrier name */
  name: string;
  /** Carrier code */
  code: string;
  /** Supported jurisdictions */
  jurisdictions: JurisdictionCode[];
  /** Contact information */
  contact?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  /** Active status */
  isActive: boolean;
}

/**
 * Represents a contract clause or term
 */
export interface Clause {
  /** Unique identifier */
  id: string;
  /** Clause title */
  title: string;
  /** Clause content/text */
  content: string;
  /** Clause category */
  category: string;
  /** Clause tags for search/filtering */
  tags: string[];
  /** Required for specific products */
  requiredForProductIds?: string[];
  /** Jurisdiction-specific */
  jurisdiction?: JurisdictionCode;
  /** Version number */
  version: number;
  /** Effective date in ISO format */
  effectiveDate: string;
}

/**
 * Represents an optional rider/add-on
 */
export type Rider = RiderParsed;

/**
 * Represents pricing bands for products
 */
export type PricingBand = PricingBandParsed;

/**
 * Represents eligibility criteria
 */
export type Eligibility = EligibilityParsed;

/**
 * Represents data provenance/source tracking
 */
export type Provenance = ProvenanceParsed;

// ============================================================================
// App Layer Entities
// ============================================================================

/**
 * Represents a customer case/inquiry
 */
export type Case = CaseParsed;

/**
 * Represents a case brief
 */
export interface CaseBrief {
  /** Business type description */
  businessType?: string;
  /** Number of employees */
  employees?: number;
  /** Coverage types needed */
  coverage?: string;
  /** Free text notes */
  freeText?: string;
  /** Client name (for display and search) */
  clientName?: string;
  /** Selected client ID (if from existing client) */
  selectedClientId?: string | null;
  /** Insurance category */
  insurance_category?: string;
  /** Maximum budget for insurance */
  max_budget?: number;
  /** Budget currency */
  budget_currency?: CurrencyCode;
  /** Required coverages list */
  required_coverages?: string[];
  /** Client profile description */
  client_profile?: string;
}

/**
 * Represents a generated artifact (document, report, etc.)
 */
export interface Artifact {
  /** Unique identifier */
  id: string;
  /** Artifact type */
  type: 'proposal' | 'quote' | 'policy_document' | 'comparison_report' | 'compliance_checklist';
  /** Associated case ID */
  caseId: string;
  /** Artifact name */
  name: string;
  /** Generation timestamp in ISO format */
  generatedAt: string;
  /** Expiration timestamp in ISO format */
  expiresAt?: string;
  /** Share URL */
  shareUrl?: string;
  /** Artifact metadata */
  metadata?: Record<string, unknown>;
  /** Artifact content/data */
  content?: unknown;
}

/**
 * Represents a policy
 */
export type Policy = PolicyParsed;

/**
 * Represents a policy proposal
 */
export type Proposal = ProposalParsed;

/**
 * Represents a selected plan in a proposal
 */
export type ProposalSelectedPlan = ProposalSelectedPlanParsed;

/**
 * Represents proposal math validation
 */
export type ProposalMathCheck = ProposalMathCheckParsed;

/**
 * Represents a broker profile
 */
export type BrokerProfile = BrokerProfileParsed;

/**
 * Represents a renewal record
 */
export type RenewalRecord = RenewalRecordParsed;

/**
 * Represents a comparison playbook configuration
 */
export interface Playbook {
  /** Unique identifier */
  id: string;
  /** Playbook name */
  name: string;
  /** Playbook type */
  type: ComparisonPlaybook;
  /** Weight configuration */
  weights: ComparisonWeights;
  /** Description */
  description?: string;
  /** Target market/segment */
  targetSegment?: string;
}

/**
 * Represents comparison weights
 */
export interface ComparisonWeights {
  /** Premium weight (0-100) */
  premium: number;
  /** Deductible weight (0-100) */
  deductible: number;
  /** Riders weight (0-100) */
  riders: number;
  /** Network weight (0-100) */
  network: number;
  /** Service weight (0-100) */
  service: number;
}

/**
 * Represents an audit entry
 */
export interface AuditEntry {
  /** Unique identifier */
  id: string;
  /** Event type */
  type: AuditEventType;
  /** Entity type */
  entityType: string;
  /** Entity ID */
  entityId: string;
  /** User/Actor ID */
  actorId?: string;
  /** Timestamp in ISO format */
  timestamp: string;
  /** Event payload */
  payload?: Record<string, unknown>;
  /** IP address */
  ipAddress?: string;
  /** User agent */
  userAgent?: string;
  /** Session ID */
  sessionId?: string;
}

// ============================================================================
// Composite Types
// ============================================================================

/**
 * Policy comparison score
 */
export interface PolicyComparisonScore {
  /** Plan name */
  plan: string;
  /** Total score (0-100) */
  total: number;
  /** Score breakdown by metric */
  breakdown: Record<ComparisonMetric, number>;
}

/**
 * Comparison metric types
 */
export type ComparisonMetric = 'premium' | 'deductible' | 'riders' | 'network' | 'service';

/**
 * Lightweight view model for policies used in the UI layer
 */
export type PolicyView = Pick<Policy, "id" | "plan" | "riders" | "network" | "service"> & {
  premium: number;
  deductible: number;
  currency: CurrencyCode;
};

/**
 * Lightweight view model for renewals used in the UI layer
 */
export interface RenewalView extends Omit<RenewalRecord, "premium"> {
  premium: number;
}

/**
 * Renewal filters
 */
export interface RenewalsFilters {
  /** Window days filter */
  windowDays: RenewalWindowDays;
  /** Carrier filters */
  carriers: string[];
  /** Status filters */
  statuses: RenewalStatus[];
}

/**
 * Renewal sorting configuration
 */
export type RenewalsSortBy = 'date' | 'premium';
export type RenewalsSortDir = 'asc' | 'desc';

export interface RenewalsSorting {
  /** Sort by field */
  sortBy: RenewalsSortBy;
  /** Sort direction */
  sortDir: RenewalsSortDir;
}

/**
 * Share payload for sending proposals
 */
export interface SharePayload {
  /** Share channel */
  channel: ShareChannel;
  /** Jurisdiction */
  jurisdiction: string;
  /** Proposal data */
  proposal: Proposal;
}

/**
 * Compliance checked state
 */
export type ComplianceCheckedState = Record<JurisdictionCode, Record<string, boolean>>;

/**
 * Renewal status chip properties
 */
export interface RenewalStatusChipProps {
  /** Label text */
  label: string;
  /** Visual tone */
  tone: 'neutral' | 'warning' | 'critical';
}
