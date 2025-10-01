/**
 * Briki Domain Model Type Definitions
 * 
 * This file contains the authoritative domain model surface for Phase 2.
 * All domain entities are defined here with strict typing, no any types,
 * explicit unions, ISO dates, and consistent money representation.
 */

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
export interface Product {
  /** Unique identifier */
  id: string;
  /** Product name */
  name: string;
  /** Product code/SKU */
  code: string;
  /** Carrier identifier */
  carrierId: string;
  /** Product description */
  description?: string;
  /** Coverage type */
  coverageKind: CoverageKind;
  /** Available riders for this product */
  availableRiderIds: string[];
  /** Base premium range */
  basePremiumRange?: {
    min: Money;
    max: Money;
  };
  /** Product metadata */
  metadata?: Record<string, unknown>;
  /** Active status */
  isActive: boolean;
  /** Creation date in ISO format */
  createdAt: string;
  /** Last update date in ISO format */
  updatedAt: string;
}

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
export interface Rider {
  /** Unique identifier */
  id: string;
  /** Rider name */
  name: string;
  /** Rider code */
  code: string;
  /** Rider type */
  type: RiderType;
  /** Description */
  description?: string;
  /** Premium adjustment */
  premiumAdjustment: Money;
  /** Coverage details */
  coverageDetails?: Record<string, unknown>;
  /** Compatible product IDs */
  compatibleProductIds: string[];
  /** Active status */
  isActive: boolean;
}

/**
 * Represents pricing bands for products
 */
export interface PricingBand {
  /** Unique identifier */
  id: string;
  /** Band name */
  name: string;
  /** Band type */
  type: PricingBandType;
  /** Product ID this band applies to */
  productId: string;
  /** Employee count range */
  employeeRange?: {
    min: number;
    max?: number;
  };
  /** Age range */
  ageRange?: {
    min: number;
    max: number;
  };
  /** Base premium */
  basePremium: Money;
  /** Deductible options */
  deductibleOptions: Money[];
  /** Discount percentage (0-100) */
  discountPercentage?: number;
  /** Effective date range */
  effectiveDateRange: {
    start: string; // ISO date
    end?: string; // ISO date, optional for open-ended
  };
}

/**
 * Represents eligibility criteria
 */
export interface Eligibility {
  /** Unique identifier */
  id: string;
  /** Product ID */
  productId: string;
  /** Minimum employee count */
  minEmployees?: number;
  /** Maximum employee count */
  maxEmployees?: number;
  /** Required business types */
  requiredBusinessTypes?: string[];
  /** Excluded business types */
  excludedBusinessTypes?: string[];
  /** Geographic restrictions */
  geographicRestrictions?: {
    jurisdictions: JurisdictionCode[];
    cities?: string[];
    regions?: string[];
  };
  /** Other criteria */
  customCriteria?: Record<string, unknown>;
}

/**
 * Represents data provenance/source tracking
 */
export interface Provenance {
  /** Unique identifier */
  id: string;
  /** Entity type this provenance refers to */
  entityType: 'product' | 'policy' | 'quote' | 'carrier' | 'rider';
  /** Entity ID */
  entityId: string;
  /** Source system/API */
  source: string;
  /** Source timestamp in ISO format */
  sourceTimestamp: string;
  /** Import timestamp in ISO format */
  importTimestamp: string;
  /** Source metadata */
  sourceMetadata?: Record<string, unknown>;
  /** Data quality score (0-100) */
  qualityScore?: number;
}

// ============================================================================
// App Layer Entities
// ============================================================================

/**
 * Represents a customer case/inquiry
 */
export interface Case {
  /** Unique identifier */
  id: string;
  /** Case reference number */
  referenceNumber: string;
  /** Case brief information */
  brief: CaseBrief;
  /** Broker profile handling the case */
  brokerId?: string;
  /** Customer information */
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    companyName?: string;
  };
  /** Case status */
  status: 'new' | 'in_progress' | 'quoted' | 'closed' | 'won' | 'lost';
  /** Source channel */
  channel: Channel;
  /** Associated policy IDs */
  policyIds: string[];
  /** Associated quote IDs */
  quoteIds: string[];
  /** Creation date in ISO format */
  createdAt: string;
  /** Last update date in ISO format */
  updatedAt: string;
}

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
export interface Policy {
  /** Unique identifier */
  id: string;
  /** Policy plan name */
  plan: string;
  /** Policy number */
  policyNumber?: string;
  /** Product ID */
  productId?: string;
  /** Carrier ID */
  carrierId?: string;
  /** Premium amount */
  premium: Money;
  /** Deductible amount */
  deductible: Money;
  /** Selected rider IDs */
  riders: string[];
  /** Network level */
  network?: NetworkLevel;
  /** Service level */
  service?: ServiceLevel;
  /** Policy status */
  status?: PolicyStatus;
  /** Effective date in ISO format */
  effectiveDate?: string;
  /** Expiration date in ISO format */
  expirationDate?: string;
  /** Renewal date in ISO format */
  renewalDate?: string;
}

/**
 * Represents a policy proposal
 */
export interface Proposal {
  /** Unique identifier */
  id: string;
  /** Associated case ID */
  caseId: string;
  /** Broker profile */
  broker: BrokerProfile;
  /** Case brief */
  brief: CaseBrief;
  /** Selected plans */
  selectedPlans: ProposalSelectedPlan[];
  /** Disclosure keys */
  disclosuresKeys: string[];
  /** Math check validation */
  mathCheck: ProposalMathCheck;
  /** Share URL */
  shareUrl: string;
  /** Generation date in ISO format */
  generatedOn: string;
  /** Proposal metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Represents a selected plan in a proposal
 */
export interface ProposalSelectedPlan {
  /** Plan/Policy ID */
  planId: string;
  /** Rationale key for i18n */
  rationaleKey?: string;
}

/**
 * Represents proposal math validation
 */
export interface ProposalMathCheck {
  /** Validation passed */
  passed: boolean;
  /** Message key for i18n */
  messageKey: string;
}

/**
 * Represents a broker profile
 */
export interface BrokerProfile {
  /** Broker name */
  name: string;
  /** Agency name */
  agency: string;
  /** Email address */
  email?: string;
  /** Phone number */
  phone?: string;
  /** Brand color in hex format */
  brandColor: string;
  /** Logo URL */
  logoUrl?: string;
}

/**
 * Represents a renewal record
 */
export interface RenewalRecord {
  /** Unique identifier */
  id: string;
  /** Carrier name */
  carrier: string;
  /** Plan name */
  plan: string;
  /** Renewal date in ISO format */
  renewalDateISO: string;
  /** Premium amount */
  premium: Money;
  /** Renewal status */
  status: RenewalStatus;
  /** Reminder set flag */
  reminderSet: boolean;
  /** Associated policy ID */
  policyId?: string;
}

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
