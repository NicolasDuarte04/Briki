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
  // ✅ FASE RENOVACIONES: Nuevos tipos
  RenewalFullParsed,
  RenewalHistoryParsed,
  RenewalAlertParsed,
  RenewalProcessStatusParsed,
  RenewalWindowStatusParsed,
  RenewalAlertTypeParsed,
  AlertSeverityParsed,
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
 * null = "All" (no time restriction)
 */
export type RenewalWindowDays = 30 | 60 | 90 | null;

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
  | 'compliance'
  | 'followups';

/**
 * Workspace tabs
 */
export type WorkspaceTab = "case-brief" | "policies" | "analysis" | "comparisons" | "proposal" | "compliance" | "renewals";

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
  employees?: number | null;
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
  max_budget?: number | null;
  /** Budget currency */
  budget_currency?: CurrencyCode;
  /** Required coverages list */
  required_coverages?: string[];
  /** Client profile description */
  client_profile?: string;
  /** Temporary uploads from Landing (PDFs pending to be saved as artifacts) */
  tempUploads?: Array<{
    id: string;
    storagePath: string;
    fileName: string;
    fileSize: number;
    pageCount?: number;
    charactersExtracted?: number;
    fileHash?: string;
    extractedText?: string;
  }>;
  /** Linked org policy IDs to be associated with the case */
  linkedPolicyIds?: string[];
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
 * Represents a renewal record (legacy - used by current mock UI)
 */
export type RenewalRecord = RenewalRecordParsed;

// ============================================================================
// ✅ FASE RENOVACIONES: Tipos completos para sistema de renovaciones
// ============================================================================

/**
 * Represents the process status of a renewal
 */
export type RenewalProcessStatus = RenewalProcessStatusParsed;

/**
 * Represents the urgency window status (ok, dueSoon, overdue)
 */
export type RenewalWindowStatus = RenewalWindowStatusParsed;

/**
 * Represents a full renewal from the database with all fields
 */
export type RenewalFull = RenewalFullParsed;

/**
 * Represents a historical record of a renewal period
 */
export type RenewalHistory = RenewalHistoryParsed;

/**
 * Represents an alert for a renewal
 */
export type RenewalAlert = RenewalAlertParsed;

/**
 * Represents the type of renewal alert
 */
export type RenewalAlertType = RenewalAlertTypeParsed;

/**
 * Represents alert severity levels
 */
export type AlertSeverity = AlertSeverityParsed;

/**
 * Changes detected between renewal periods
 */
export interface RenewalChanges {
  premiumChange?: number; // Percentage
  coveragesAdded?: string[];
  coveragesRemoved?: string[];
  deductibleChange?: number; // Percentage
}

/**
 * Extended filters for renewals including process status
 */
export interface RenewalFiltersExtended {
  windowDays: RenewalWindowDays;
  carriers: string[];
  statuses: RenewalWindowStatus[];
  processStatuses?: RenewalProcessStatus[];
  premiumChangeMin?: number; // Percentage
  premiumChangeMax?: number; // Percentage
  hasProposal?: boolean;
  hasReminder?: boolean;
}

/**
 * Represents export format options for proposals
 */
export type ProposalExportFormat = 'pdf' | 'excel' | 'json';
export interface GeneratedProposal {
  id: string;
  caseId: string;
  comparisonId?: string;
  version: 'client' | 'technical';
  content: any; // JSONB
  status: 'draft' | 'final' | 'sent';
  createdAt: string;
  updatedAt: string;
  userId: string;
  orgId: string;
}

// ✅ FASE 32: Compliance Support
export interface ComplianceRecord {
  id: string;
  caseId: string;
  jurisdiction: JurisdictionCode;
  insuranceType?: string;
  checklistData: Record<string, { checked: boolean; verifiedBy?: string }>;
  kycStatus?: "pending" | "verified" | "failed";
  kycVerifiedAt?: string;
  validatedDates?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export type ComplianceAuditEventType =
  | "RecordCreated"
  | "RecordUpdated"
  | "ItemChecked"
  | "ItemUnchecked"
  | "KYCVerified"
  | "KYCFailed"
  | "DatesValidated"
  | "SendAttempt"
  | "SendBlocked"
  | "SendSuccess"
  | "ReportGenerated";

export interface ComplianceAuditEvent {
  id: string;
  recordId: string;
  eventType: ComplianceAuditEventType;
  itemId?: string;
  documentId?: string;
  userId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
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
 * ✅ FASE 6: Extended to include policy analysis fields
 * ✅ CORRECCIÓN: network y service opcionales para compatibilidad
 */
export type PolicyView = Pick<Policy, "id" | "plan" | "riders"> & {
  premium: number;
  deductible: number;
  currency: CurrencyCode;
  // Campos legacy (opcionales para compatibilidad con mock data)
  network?: string;
  service?: string;
  // ✅ FASE 6: New fields from policy analysis
  confidence?: number;
  artifactId?: string;
  analysisId?: string;
  pageReference?: number;
  // ✅ FASE POLICY_LINKS: Fields for linked organization policies
  linkType?: 'direct' | 'linked';
  linkId?: string; // ID del CasePolicyLink para desvinculación
  // ✅ FASE CONTEXTUALIZACIÓN: Timestamp de contextualización (null = pendiente)
  contextualizedAt?: Date | string | null;
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
  /** Window days filter (null = show all) */
  windowDays: RenewalWindowDays | null;
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

// ============================================================================
// POLICY ANALYSIS TYPES - FASE 4
// Added: 16 November 2025
// Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.4
// ============================================================================

/**
 * Page reference from policy analysis
 * Links extracted fields to specific locations in the PDF
 */
export interface PolicyPageReference {
  /** Unique identifier */
  id: string;
  /** Policy analysis ID this reference belongs to */
  policyAnalysisId: string;
  /** Field name (e.g., 'premium_total', 'policy_number') */
  fieldName: string;
  /** Extracted value */
  fieldValue: string | null;
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Bounding box coordinates */
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Policy analysis with structured data extracted from PDF
 * Contains all extracted policy data plus metadata and page references
 */
export interface PolicyAnalysis {
  /** Unique identifier */
  id: string;
  /** Artifact (PDF) ID that was analyzed */
  artifactId: string;
  /** Case ID this analysis belongs to */
  caseId: string;
  /** Organization ID */
  orgId: string;
  /** Structured extracted data (JSONB) */
  extractedData: Record<string, any>;
  /** Extraction method used */
  extractionMethod: 'manual' | 'ocr' | 'hybrid';
  /** Overall confidence score (0-1) */
  overallConfidence: number;
  /** When extraction was performed */
  extractedAt: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  // ✅ FASE POLICY_LINKS: Fields for linked organization policies
  /** Type of link: 'direct' (artifact belongs to case) or 'linked' (via CasePolicyLink) */
  linkType?: 'direct' | 'linked';
  /** CasePolicyLink ID (only for linked policies) */
  linkId?: string | null;
  /** When the policy was linked to the case */
  linkedAt?: Date | string | null;
  /** User who linked the policy */
  linkedBy?: string | null;
  /** When the policy analysis was contextualized with the case (null = pending) */
  contextualizedAt?: Date | string | null;
  /** Related artifact info (when included) */
  artifact?: {
    id: string;
    fileName: string;
    contentType: string;
    fileId: string;
    createdAt: string;
  };
  /** Page references (when included) */
  pageReferences?: PolicyPageReference[];
}

/**
 * View model for policy analysis in UI
 * Simplified version with commonly accessed fields for display
 */
export interface PolicyAnalysisView {
  /** Unique identifier */
  id: string;
  /** Artifact ID */
  artifactId: string;
  /** File name of analyzed PDF */
  fileName: string;
  /** Policy number (from extracted data) */
  policyNumber?: string;
  /** Insured name (from extracted data) */
  insuredName?: string;
  /** Insurer name (from extracted data) */
  insurerName?: string;
  /** Premium total (from extracted data, in minor units) */
  premiumTotal?: number;
  /** Currency code */
  currency?: CurrencyCode;
  /** Overall confidence */
  confidence: number;
  /** Number of page references */
  referencesCount: number;
  /** When extracted */
  extractedAt: string;
}

// ========================================
// FASE 30: TIPOS PARA COMPARACIÓN DE PÓLIZAS
// ========================================

/** Referencia profunda a ubicación exacta en PDF */
export interface PdfDeepReference {
  /** ID del análisis al que pertenece */
  analysisId: string;
  /** ID del artifact (PDF) */
  artifactId: string;
  /** Número de página (1-indexed) */
  page: number;
  /** Coordenadas en la página */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Texto extraído */
  text: string;
  /** Confianza de la extracción (0-1) */
  confidence: number;
}

/** Cobertura normalizada para comparación */
export interface NormalizedCoverage {
  /** Nombre canónico de la cobertura */
  name: string;
  /** Descripción extraída */
  description?: string;
  /** Límite normalizado (número) */
  limitAmount?: number;
  /** Unidad del límite */
  limitUnit?: string;  // 'COP', 'USD', 'UVR', '%'
  /** Sublímites */
  sublimits?: NormalizedCoverage[];
  /** Deducible normalizado */
  deductibleAmount?: number;
  deductibleUnit?: string;
  /** Período de carencia */
  waitingPeriod?: string;
  /** Referencia al PDF origen */
  source: PdfDeepReference;
}

/** Celda individual en tabla de comparación */
export interface ComparisonCell {
  /** Valor de la cobertura (o null si falta) */
  value: NormalizedCoverage | null;
  /** Referencia al PDF */
  reference: PdfDeepReference | null;
  /** Status relativo */
  status: 'better' | 'equal' | 'worse' | 'missing';
  /** Nota manual del usuario */
  userNote?: string;
}

/** Fila de comparación (una cobertura entre N pólizas) */
export interface ComparisonRow {
  /** ID único de la fila */
  id: string;
  /** Nombre de la cobertura */
  coverageName: string;
  /** Categoría (Cobertura, Exclusión, Deducible, etc.) */
  category: 'coverage' | 'exclusion' | 'deductible' | 'benefit' | 'requirement';
  /** Si es obligatoria según perfil del cliente */
  isMandatory: boolean;
  /** Valores por cada póliza analizada */
  values: Record<string, ComparisonCell>;  // Key: analysisId
  /** Status general de la fila */
  status: 'all_present' | 'partial' | 'missing_critical';
}

/** Filtros para la tabla de comparación */
export interface ComparisonFilters {
  /** Filtrar por categoría */
  categories?: ComparisonRow['category'][];
  /** Solo mostrar filas con diferencias */
  onlyDifferences?: boolean;
  /** Solo mostrar filas obligatorias */
  onlyMandatory?: boolean;
  /** Buscar por texto */
  searchQuery?: string;
}

/** Resultado completo de una comparación */
export interface PolicyComparison {
  /** ID único de la comparación */
  id: string;
  /** Caso al que pertenece */
  caseId: string;
  /** IDs de análisis comparados */
  analysisIds: string[];
  /** Filas de la tabla */
  rows: ComparisonRow[];
  /** Método de alineación usado */
  alignmentMethod: 'semantic' | 'manual' | 'hybrid';
  /** Filtros aplicados */
  filters: ComparisonFilters;
  /** Timestamp */
  createdAt: string;
}

/** Exportación de comparación */
export interface ComparisonExport {
  /** Tipo de exportación */
  format: 'pdf' | 'excel' | 'json';
  /** Título del documento */
  title: string;
  /** Incluir referencias a páginas */
  includeReferences: boolean;
  /** Versión (cliente o técnica) */
  version: 'client' | 'technical';
}

// ✅ FASE 40: Renewal Process
export interface RenewalProcess {
  id: string;
  caseId: string;
  previousCaseId: string | null;
  status: string; // 'pending' | 'quoted' | 'bound' | 'lost'
  renewalDate: string; // ISO Date
  reminderDate: string | null;
  premiumDelta: {
    current: number;
    previous: number;
    pct: number;
  } | null;
  coverageChanges: Array<{
    field: string;
    from: string;
    to: string;
  }> | null;
  createdAt: string;
  updatedAt: string;
}
