import { getTranslations } from "next-intl/server";
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { toast } from 'sonner';
import { ChatMessage as BaseChatMessage } from "@/store/useChatStore";
import React from "react";

// Tipo extendido que soporta React.ReactNode para el contenido
type ChatMessage = Omit<BaseChatMessage, 'content'> & {
  content: string | React.ReactNode;
};

import { complianceChecklistItems, complianceJurisdictions, type JurisdictionCode } from "../compliance";
import {
  type BrokerProfile,
  type Case,
  type CaseBrief,
  type ComparisonMetric,
  type ComparisonPlaybook,
  type ComparisonWeights,
  type Eligibility,
  type NetworkLevel,
  type Policy,
  type PolicyAnalysis,
  type PolicyAnalysisView,
  type PolicyComparisonScore,
  type PolicyView,
  type PricingBand,
  type Product,
  type Provenance,
  type ProposalMathCheck,
  type ProposalSelectedPlan,
  type RenewalRecord,
  type RenewalStatus,
  type RenewalStatusChipProps,
  type RenewalsFilters,
  type RenewalsSorting,
  type RenewalsSortBy,
  type RenewalsSortDir,
  type RenewalView,
  type RenewalWindowDays,
  type Rider,
  type ServiceLevel,
  type UIStep,
  type WorkspaceTab,
  type ComparisonRow,
  type ComparisonCell,
  type ComparisonFilters,
  type PolicyComparison,
  type ComparisonExport,
  type CurrencyCode,
  // ✅ FASE 31: Proposals
  type GeneratedProposal,
  // ✅ FASE 32: Compliance
  type ComplianceRecord,
} from "@/lib/types";
import {
  loadCases,
  loadEligibilities,
  loadPolicies,
  loadPricingBands,
  loadProducts,
  loadProvenance,
  loadRenewals,
  loadRiders,
  createRenewal,
  updateRenewal,
  deleteRenewal,
  detectRenewals,
  getRenewalStats,
  setRenewalReminder,
} from "../fx";
import { sendViaEmail, sendViaWhatsApp } from "../share";

// Local helper to convert policies into view objects consumed by components
const policyToView = (policy: Policy): PolicyView => {
  const { id, plan, riders, network, service, premium, deductible } = policy;
  return {
    id,
    plan,
    riders,
    premium: premium.amountMinor / 100,
    deductible: deductible.amountMinor / 100,
    currency: premium.currency,
    ...(network && { network }),
    ...(service && { service }),
  };
};

/**
 * Transform PolicyAnalysis to PolicyAnalysisView for UI consumption
 * 
 * FASE 4: Estado Global y Transformaciones
 * Source: PLAN_ANALISIS_POLIZAS_PDF.md Section 6.4
 * 
 * Extracts commonly accessed fields from the JSONB extracted_data
 * and formats them for display in components.
 * 
 * @param analysis - Policy analysis from database
 * @returns View model optimized for UI rendering
 */
const analysisToView = (analysis: PolicyAnalysis): PolicyAnalysisView => {
  const { extractedData } = analysis;

  // Extract commonly used fields from JSONB
  const policyNumber = extractedData?.policy_number || undefined;
  const insuredName = extractedData?.insured_name || undefined;
  const insurerName = extractedData?.insurer?.name || undefined;

  // Extract financial data
  const premiumTotal = extractedData?.financials?.premium_total;
  const currency = (extractedData?.currency as CurrencyCode) || 'USD';

  // Convert premium to minor units if it exists (API returns in major units)
  const premiumTotalMinor = premiumTotal ? Math.round(premiumTotal * 100) : undefined;

  return {
    id: analysis.id,
    artifactId: analysis.artifactId,
    fileName: analysis.artifact?.fileName || 'Unknown PDF',
    policyNumber,
    ...(insuredName !== undefined ? { insuredName } : {}),
    ...(insurerName !== undefined ? { insurerName } : {}),
    ...(premiumTotalMinor !== undefined ? { premiumTotal: premiumTotalMinor } : {}),
    currency,
    confidence: analysis.overallConfidence,
    referencesCount: analysis.pageReferences?.length || 0,
    extractedAt: analysis.extractedAt,
  };
};

export type {
  BrokerProfile,
  Case,
  CaseBrief,
  ComparisonMetric,
  ComparisonPlaybook,
  ComparisonWeights,
  Eligibility,
  Policy,
  PolicyAnalysis,
  PolicyAnalysisView,
  PolicyComparisonScore,
  PricingBand,
  Product,
  Provenance,
  ProposalMathCheck,
  ProposalSelectedPlan,
  RenewalRecord,
  RenewalStatus,
  RenewalStatusChipProps,
  RenewalsFilters,
  RenewalsSorting,
  RenewalWindowDays,
  Rider,
  UIStep,
} from "../types";

export type ProposalData = {
  broker: BrokerProfile;
  brief: CaseBrief;
  selectedPlans: ProposalSelectedPlan[];
  disclosuresKeys: string[];
  mathCheck: ProposalMathCheck;
  shareUrl: string;
  generatedOn: string | null;
};

export type RenewalsEventType =
  | "RenewalsViewOpen"
  | "FilterChange"
  | "SortChange"
  | "NudgeQuote"
  | "NudgeMessage"
  | "ReminderOpen"
  | "ReminderSet"
  | "DetectRenewalsStart"
  | "DetectRenewalsComplete"
  | "CompareFromRenewal"
  | "ProposalFromRenewal";

interface RenewalsAuditEvent {
  type: RenewalsEventType;
  sequence: number;
  ts: number;
  payload?: Record<string, unknown>;
}

const RENEWALS_REFERENCE_DATE_ISO = "2025-03-01T00:00:00.000Z";
const RENEWALS_REFERENCE_DATE = new Date(RENEWALS_REFERENCE_DATE_ISO);
const RENEWAL_WINDOWS: RenewalWindowDays[] = [30, 60, 90];

const defaultRenewalsFilters: RenewalsFilters = {
  windowDays: 90,
  carriers: [],
  statuses: [],
};

const defaultRenewalsSorting: RenewalsSorting = {
  sortBy: "date",
  sortDir: "desc",
};

const renewalStatusMetaMap: Record<RenewalStatus, RenewalStatusMeta> = {
  ok: { status: "ok", tone: "neutral" },
  dueSoon: { status: "dueSoon", tone: "warning" },
  overdue: { status: "overdue", tone: "critical" },
};

type ComplianceJurisdiction = JurisdictionCode;
type ComplianceChecklistItemsMap = typeof complianceChecklistItems;
type ComplianceItemId = ComplianceChecklistItemsMap[ComplianceJurisdiction][number];
type ComplianceCheckedState = Record<ComplianceJurisdiction, Record<ComplianceItemId, boolean>>;
type ComplianceEventType =
  | "ComplianceOpen"
  | "ChecklistToggle"
  | "CompliancePass"
  | "SendAttempt"
  | "SendBlocked"
  | "SendSuccess";

// LocalComplianceEvent moved to bottom of file


type FollowupEventType = "FollowupCadenceChanged";

interface FollowupAuditEvent {
  type: FollowupEventType;
  ts: number;
  payload: { cadenceDays: number[] };
}

const playbookPresets: Record<ComparisonPlaybook, ComparisonWeights> = {
  sme: { premium: 45, deductible: 35, riders: 20, network: 15, service: 10 },
  hnwi: { premium: 20, deductible: 20, riders: 35, network: 45, service: 40 },
  auto: { premium: 50, deductible: 40, riders: 15, network: 10, service: 10 },
  travel: { premium: 30, deductible: 20, riders: 40, network: 50, service: 30 },
};

export const comparisonMetrics: readonly ComparisonMetric[] = ["premium", "deductible", "riders", "network", "service"];

const defaultComparisonWeights: ComparisonWeights = { ...playbookPresets.sme };

function renewalToView(renewal: RenewalRecord): RenewalView {
  return {
    ...renewal,
    premium: renewal.premium.amountMinor / 100,
  };
}

const defaultBrokerProfile: BrokerProfile = {
  name: "Camila Duarte",
  agency: "Andes Advisory Group",
  email: "camila@andesadvisory.com",
  phone: "+57 320 123 4567",
  brandColor: "#0F766E",
};

const defaultProposalSelectedPlans: ProposalSelectedPlan[] = [];

const defaultProposalDisclosuresKeys: string[] = [];

const defaultProposalMathCheck: ProposalMathCheck = {
  passed: true,
  messageKey: "mathCheck.messages.passed",
};

const DEFAULT_PROPOSAL_SHARE_URL = "https://briki.app/share/demo-proposal";
const DEFAULT_FOLLOWUP_CADENCE_DAYS: ReadonlyArray<number> = [2, 5];
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function sanitizeBrandColor(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  return HEX_COLOR_REGEX.test(value) ? value : fallback;
}

function sanitizeBrokerProfile(current: BrokerProfile, updates?: Partial<BrokerProfile>): BrokerProfile {
  const base = current ?? defaultBrokerProfile;

  const result: BrokerProfile = {
    name: asTrimmedString(updates?.name) ?? base.name ?? defaultBrokerProfile.name,
    agency: asTrimmedString(updates?.agency) ?? base.agency ?? defaultBrokerProfile.agency,
    brandColor: sanitizeBrandColor(asTrimmedString(updates?.brandColor), base.brandColor ?? defaultBrokerProfile.brandColor),
  };

  const email = asTrimmedString(updates?.email) ?? base.email;
  if (email !== undefined) {
    result.email = email;
  }

  const phone = asTrimmedString(updates?.phone) ?? base.phone;
  if (phone !== undefined) {
    result.phone = phone;
  }

  const logoUrl = asTrimmedString(updates?.logoUrl) ?? base.logoUrl;
  if (logoUrl !== undefined) {
    result.logoUrl = logoUrl;
  }

  return result;
}

function sanitizeSelectedPlans(plans: ProposalSelectedPlan[] | undefined): ProposalSelectedPlan[] {
  const source = Array.isArray(plans) ? plans : defaultProposalSelectedPlans;
  const seen = new Set<string>();

  const sanitized = source.reduce<ProposalSelectedPlan[]>((acc, plan) => {
    const planId = asTrimmedString(plan?.planId);
    if (!planId || seen.has(planId)) {
      return acc;
    }

    seen.add(planId);
    const rationaleKey = asTrimmedString(plan?.rationaleKey) ?? "selectedPlans.defaultRationale";
    acc.push({ planId, rationaleKey });
    return acc;
  }, []);

  return sanitized.length ? sanitized : defaultProposalSelectedPlans.map((plan) => ({ ...plan }));
}

function sanitizeDisclosureKeys(keys: string[] | undefined): string[] {
  if (!Array.isArray(keys)) {
    return [...defaultProposalDisclosuresKeys];
  }

  const sanitized: string[] = [];
  for (const key of keys) {
    const trimmed = asTrimmedString(key);
    if (!trimmed || sanitized.includes(trimmed)) continue;
    sanitized.push(trimmed);
  }

  return sanitized.length ? sanitized : [...defaultProposalDisclosuresKeys];
}

function sanitizeMathCheck(mathCheck: ProposalMathCheck | Partial<ProposalMathCheck> | undefined): ProposalMathCheck {
  if (!mathCheck) {
    return { ...defaultProposalMathCheck };
  }

  return {
    passed: typeof mathCheck.passed === "boolean" ? mathCheck.passed : defaultProposalMathCheck.passed,
    messageKey: asTrimmedString(mathCheck.messageKey) ?? defaultProposalMathCheck.messageKey,
  };
}

function sanitizeShareUrl(url: string | undefined): string {
  const trimmed = asTrimmedString(url);
  if (!trimmed) return DEFAULT_PROPOSAL_SHARE_URL;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return DEFAULT_PROPOSAL_SHARE_URL;
  } catch {
    return DEFAULT_PROPOSAL_SHARE_URL;
  }
}

function deriveRenewalStatus(renewalDateISO: string, referenceDate = RENEWALS_REFERENCE_DATE): RenewalStatus {
  const renewalTime = Date.parse(renewalDateISO);
  if (!Number.isFinite(renewalTime)) {
    return "ok";
  }
  const diffMs = renewalTime - referenceDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays <= 30) {
    return "dueSoon";
  }
  return "ok";
}

function sanitizeRenewalsFilters(filters: RenewalsFilters): RenewalsFilters {
  const windowDays = RENEWAL_WINDOWS.includes(filters.windowDays) ? filters.windowDays : 90;
  const carriers = Array.isArray(filters.carriers) ? dedupeStrings(filters.carriers) : [];
  const statuses = Array.isArray(filters.statuses)
    ? dedupeStatuses(filters.statuses.filter((status): status is RenewalStatus => isRenewalStatus(status)))
    : [];
  return {
    windowDays,
    carriers,
    statuses,
  } satisfies RenewalsFilters;
}

function sanitizeRenewalsSorting(sorting: RenewalsSorting): RenewalsSorting {
  const sortBy: RenewalsSortBy = sorting.sortBy === "premium" ? "premium" : "date";
  const sortDir: RenewalsSortDir = sorting.sortDir === "asc" ? "asc" : "desc";
  return { sortBy, sortDir } satisfies RenewalsSorting;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = asTrimmedString(value);
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

function isRenewalStatus(value: unknown): value is RenewalStatus {
  return value === "ok" || value === "dueSoon" || value === "overdue";
}

function dedupeStatuses(values: RenewalStatus[]): RenewalStatus[] {
  const seen = new Set<RenewalStatus>();
  const result: RenewalStatus[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      result.push(value);
    }
  }
  return result;
}

export function computeFilteredSortedRenewals(
  state: Pick<UIState, "renewals" | "renewalsFilters" | "renewalsSorting">
): RenewalRecord[] {
  const { renewals, renewalsFilters, renewalsSorting } = state;
  const filtered = renewals.filter((renewal) => {
    if (renewalsFilters.carriers.length > 0 && !renewalsFilters.carriers.includes(renewal.carrier)) {
      return false;
    }
    if (renewalsFilters.statuses.length > 0 && !renewalsFilters.statuses.includes(renewal.status)) {
      return false;
    }
    if (!isWithinWindow(renewal.renewalDateISO, renewalsFilters.windowDays)) {
      return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => compareRenewals(a, b, renewalsSorting));
  return sorted;
}

export function computeRenewalWindowCounts(
  state: Pick<UIState, "renewals">
): Record<RenewalWindowDays, number> {
  const counts: Record<RenewalWindowDays, number> = {
    30: 0,
    60: 0,
    90: 0,
  };

  for (const renewal of state.renewals) {
    for (const window of RENEWAL_WINDOWS) {
      if (isWithinWindow(renewal.renewalDateISO, window)) {
        counts[window] += 1;
      }
    }
  }

  return counts;
}

function isWithinWindow(renewalDateISO: string, windowDays: RenewalWindowDays): boolean {
  const renewalDate = Date.parse(renewalDateISO);
  if (!Number.isFinite(renewalDate)) return false;
  const diffMs = renewalDate - RENEWALS_REFERENCE_DATE.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= windowDays;
}

function compareRenewals(a: RenewalRecord, b: RenewalRecord, sorting: RenewalsSorting): number {
  let compareValue = 0;
  if (sorting.sortBy === "premium") {
    compareValue = a.premium.amountMinor - b.premium.amountMinor;
  } else {
    const aTime = Date.parse(a.renewalDateISO);
    const bTime = Date.parse(b.renewalDateISO);
    compareValue = (Number.isFinite(aTime) ? aTime : 0) - (Number.isFinite(bTime) ? bTime : 0);
  }
  return sorting.sortDir === "asc" ? compareValue : -compareValue;
}

function shallowEqualRenewalsFilters(a: RenewalsFilters, b: RenewalsFilters): boolean {
  return (
    a.windowDays === b.windowDays &&
    arraysEqual(shallowSortStrings(a.carriers), shallowSortStrings(b.carriers)) &&
    arraysEqual(shallowSortStatuses(a.statuses), shallowSortStatuses(b.statuses))
  );
}

function shallowSortStatuses(statuses: RenewalStatus[]): RenewalStatus[] {
  return [...statuses].sort();
}

function shallowEqualRenewalsSorting(a: RenewalsSorting, b: RenewalsSorting): boolean {
  return a.sortBy === b.sortBy && a.sortDir === b.sortDir;
}

function shallowSortStrings(values: string[]): string[] {
  return [...values].sort();
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function shallowEqualRenewals(a: RenewalRecord[], b: RenewalRecord[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const current = a[i];
    const next = b[i];
    if (!current || !next) return false;
    if (
      current.id !== next.id ||
      current.reminderSet !== next.reminderSet ||
      current.status !== next.status ||
      current.carrier !== next.carrier ||
      current.plan !== next.plan ||
      current.renewalDateISO !== next.renewalDateISO ||
      current.premium.amountMinor !== next.premium.amountMinor ||
      current.premium.currency !== next.premium.currency
    ) {
      return false;
    }
  }
  return true;
}

function sanitizeFollowupCadenceDays(days: number[]): number[] {
  const sanitized = Array.isArray(days)
    ? days
      .map((day) => (typeof day === "number" && Number.isFinite(day) ? Math.max(0, Math.round(day)) : null))
      .filter((day): day is number => day !== null)
    : [];
  if (!sanitized.length) {
    return [...DEFAULT_FOLLOWUP_CADENCE_DAYS];
  }
  const unique = Array.from(new Set(sanitized)).sort((a, b) => a - b);
  return unique;
}

function appendFollowupEvent(log: FollowupAuditEvent[], cadenceDays: number[]): FollowupAuditEvent[] {
  const event: FollowupAuditEvent = {
    type: "FollowupCadenceChanged",
    ts: Date.now(),
    payload: { cadenceDays },
  };
  if (log.length === 0) {
    return [event];
  }
  return [...log, event];
}

function formatFollowupCadence(days: number[]): string {
  if (!days.length) {
    return "T";
  }
  return days.map((day) => `T+${day}d`).join(" / ");
}

function logRenewalsEventInternal(
  state: UIState,
  type: RenewalsEventType,
  payload?: Record<string, unknown>
): Pick<UIState, "renewalsAuditLog" | "renewalsSequence"> {
  const sequence = state.renewalsSequence + 1;
  const event: RenewalsAuditEvent = {
    type,
    sequence,
    ts: Date.now(),
  };
  if (payload !== undefined) {
    event.payload = payload;
  }
  const renewalsAuditLog = [...state.renewalsAuditLog, event];
  return { renewalsAuditLog, renewalsSequence: sequence };
}

export interface RenewalStatusMeta {
  status: RenewalStatus;
  tone: RenewalStatusChipProps["tone"];
}

// ✅ NUEVO: Tipo unificado para la fase de aprobación
export type ApprovalPhase = 'pending' | 'processing' | 'completed';

export interface UIState {
  initialMessage?: string;
  currentCaseId: string | null;
  currentOrgId: string | null; // ✅ NUEVO: Organización activa actual
  dashboardViewTime?: number;
  // Navigation & Layout
  step: UIStep;
  isSourcing: boolean;
  rightOpen: boolean;
  complianceOpen: boolean;
  chatPanelOpen: boolean;
  // Estado del sidebar
  sidebarOpen: boolean;
  sidebarHovered: boolean;

  // ✅ NUEVO: Estado unificado de aprobación
  approvalPhase: ApprovalPhase;

  // ✅ NUEVO: Helpers computados para lógica de botones
  shouldShowApprovalButtons: () => boolean;
  areApprovalButtonsEnabled: () => boolean;
  // Nuevo estado para el flujo de briefing
  briefingCase: { isActive: boolean; initialMessage: string } | null;
  complianceJurisdiction: ComplianceJurisdiction;
  checked: ComplianceCheckedState;
  complianceAuditLog: LocalComplianceEvent[];
  // ✅ FASE 32: Compliance Persistence
  activeComplianceRecord: ComplianceRecord | null;
  complianceLoading: boolean;
  complianceKycStatus: ComplianceRecord["kycStatus"] | null;
  complianceValidationErrors: string[];
  complianceStartDate?: string; // Phase 33.5
  complianceEndDate?: string;   // Phase 33.5
  selectedCompliancePolicyId?: string | null; // ✅ FASE 1: Póliza seleccionada para validación

  followupCadenceDays: number[];
  followupAuditLog: FollowupAuditEvent[];
  brief: CaseBrief;

  // ✅ FASE 21: Navegación PDF
  pdfNavigationTarget?: {
    page: number;
    fieldName: string | null;
    analysisId: string;
  } | undefined;

  selectedField?: string | null; // ✅ NUEVO: Campo seleccionado para highlighting

  // ✅ FASE 22: Prevención de Análisis Duplicado
  _pendingPolicyAnalysis?: Set<string>;

  policies: Policy[];
  policiesLoading: boolean;
  policiesLoaded: boolean;
  comparisonWeights: ComparisonWeights;
  comparisonScores: PolicyComparisonScore[];
  comparisonPlaybook: ComparisonPlaybook;

  // ✅ FASE 30: Comparación de pólizas
  activeComparison: PolicyComparison | null;
  comparisonLoading: boolean;
  comparisonFilters: ComparisonFilters;

  // ✅ FASE 31: Selección de análisis para propuesta
  selectedAnalysisIds: Set<string>;

  proposalBrokerProfile: BrokerProfile;
  proposalSelectedPlans: ProposalSelectedPlan[];
  proposalDisclosuresKeys: string[];
  proposalMathCheck: ProposalMathCheck;
  proposalShareUrl: string;
  proposalLoading: boolean;
  proposalGeneratedOn: string | null;
  activeProposal: GeneratedProposal | null; // ✅ FASE 31: Propuesta activa persistente
  products: Product[];
  productsLoading: boolean;
  productsLoaded: boolean;
  riders: Rider[];
  ridersLoading: boolean;
  ridersLoaded: boolean;
  pricingBands: PricingBand[];
  pricingBandsLoading: boolean;
  pricingBandsLoaded: boolean;
  eligibilities: Eligibility[];
  eligibilitiesLoading: boolean;
  eligibilitiesLoaded: boolean;
  provenance: Provenance[];
  provenanceLoading: boolean;
  provenanceLoaded: boolean;
  cases: Case[];
  casesLoading: boolean;
  casesLoaded: boolean;
  renewals: RenewalRecord[];
  renewalsLoading: boolean;
  renewalsLoaded: boolean;
  renewalsFilters: RenewalsFilters;
  renewalsSorting: RenewalsSorting;
  renewalsAuditLog: RenewalsAuditEvent[];
  renewalsSequence: number;
  renewalsViewLogged: boolean;
  // Estados para aprobación de casos
  caseApproving: boolean;
  caseApprovalError: string | null;
  caseApproved: boolean;
  caseResolvingClient: boolean; // ✅ NUEVO: Estado global para sincronizar validación de cliente entre los 3 botones
  // ✅ FASE 1: Flag temporal para detectar datos desde LandingPage
  landingDataPending: { freeText?: string; tempUploads?: any[] } | null;
  // Función de validación unificada del brief
  isBriefValid: () => boolean;
  // Estado de mensajes del chat
  messages: ChatMessage[];
  // ✅ FASE 4: Policy Analysis States
  policyAnalyses: PolicyAnalysis[];
  policyAnalysesLoading: boolean;
  policyAnalysesLoaded: boolean;
  selectedPolicyAnalysisId: string | null;
  selectedFieldName: string | null; // For auto-scroll to specific field
  activeTab: WorkspaceTab; // ✅ Global active tab state
  // Cache properties (internal use)
  _cachedPoliciesView?: PolicyView[];
  _cachedRenewalsView?: RenewalView[];
  _cachedFilteredRenewalsView?: RenewalView[];
  _cachedPolicyAnalysesView?: PolicyAnalysisView[] | undefined;
  setInitialMessage: (message: string) => void;
  setSelectedField: (field: string | null) => void; // ✅ NUEVO
  clearInitialMessage: () => void;
  setCurrentCaseId: (id: string | null) => void;
  setStep: (step: UIStep) => void;
  setDashboardViewTime: (timestamp: number) => void;
  // Función para aprobación de casos
  approveCurrentCase: (clientId?: string | null) => Promise<boolean>;
  resetApprovalStatus: () => void;
  setCaseApproved: (isApproved: boolean) => void;
  setApprovalPhase: (phase: ApprovalPhase) => void; // ✅ NUEVO
  // Función para enviar mensaje automático después de aprobar
  sendAutoMessage: (message: string) => Promise<void>;
  // Funciones para manejo de mensajes del chat
  addMessage: (message: ChatMessage) => void;
  setMessages: (messages: ChatMessage[]) => void;
  // Función para validación y aprobación de clientes (removida para evitar bucles infinitos)
  // validateAndApproveClient: () => Promise<boolean>;
  // setValidateAndApproveClient: (fn: () => Promise<boolean>) => void;
  // Funciones para el flujo de briefing
  startBriefing: (initialMessage: string) => void;
  completeBriefing: (caseId: string) => void;
  cancelBriefing: () => void;
  toggleRightPanel: () => void;
  openChatPanel: () => void;
  closeChatPanel: () => void;
  // Funciones del sidebar
  setSidebarOpen: (open: boolean) => void;
  setSidebarHovered: (hovered: boolean) => void;
  // ✅ FASE 32: Compliance Actions
  loadComplianceRecord: (caseId: string) => Promise<void>;
  updateComplianceItem: (itemId: string, checked: boolean) => Promise<void>;
  validateComplianceDates: (start: string, end: string) => Promise<void>;
  verifyKyc: () => Promise<void>;
  saveComplianceRecord: () => Promise<void>; // ✅ New Persistence Action
  hydrateComplianceDatesFromPolicies: () => void; // ✅ Auto-hidratar fechas desde pólizas
  setSelectedCompliancePolicyId: (policyId: string | null) => void; // ✅ FASE 1: Selector de póliza
  openCompliance: (jurisdiction: ComplianceJurisdiction) => void;
  closeCompliance: () => void;
  toggleCompliance: (itemId: ComplianceItemId) => void;
  passCompliance: (jurisdiction: ComplianceJurisdiction) => void;
  resetCompliance: (jurisdiction?: ComplianceJurisdiction) => void;
  isCompliancePassed: (jurisdiction: ComplianceJurisdiction) => boolean;
  logComplianceSendAttempt: (payload?: Record<string, unknown>) => void;
  logComplianceSendBlocked: (payload?: Record<string, unknown>) => void;
  logComplianceSendSuccess: (payload?: Record<string, unknown>) => void;
  primaryAction: () => void;
  startSourcing: () => void;
  stopSourcing: () => void;
  setBrief: (brief: Partial<CaseBrief>) => void;
  // ✅ FASE 1: Setter para landingDataPending
  setLandingDataPending: (data: { freeText?: string; tempUploads?: any[] } | null) => void;
  setFollowupCadenceDays: (days: number[]) => void;
  addFollowupDay: (day: number) => void;
  removeFollowupDay: (day: number) => void;
  followupCadenceLabel: () => string;
  setPolicies: (policies: Policy[]) => void;
  fetchPolicies: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchRiders: () => Promise<void>;
  fetchPricingBands: () => Promise<void>;
  fetchEligibilities: () => Promise<void>;
  fetchProvenance: () => Promise<void>;
  fetchCases: (force?: boolean) => Promise<void>;
  refreshCases: () => Promise<void>;
  setComparisonWeights: (weights: Partial<ComparisonWeights>) => void;
  resetComparisonWeights: () => void;
  setComparisonPlaybook: (playbook: ComparisonPlaybook) => void;
  scorePolicy: (policy: Policy, weights?: ComparisonWeights) => PolicyComparisonScore;
  setProposalBrokerProfile: (profile: Partial<BrokerProfile>) => void;
  setProposalSelectedPlans: (plans: ProposalSelectedPlan[]) => void;
  setProposalDisclosuresKeys: (keys: string[]) => void;
  addProposalDisclosureKey: (key: string) => void;
  clearProposalDisclosures: () => void;
  setProposalMathCheck: (mathCheck: ProposalMathCheck | Partial<ProposalMathCheck>) => void;
  setProposalShareUrl: (url: string) => void;
  setProposalLoading: (loading: boolean) => void;
  setProposalGeneratedOn: (date: string | null) => void;
  getProposalBrokerProfile: () => BrokerProfile;
  getProposalBrief: () => CaseBrief;
  getProposalSelectedPlans: () => ProposalSelectedPlan[];
  getProposalDisclosuresKeys: () => string[];
  getProposalMathCheck: () => ProposalMathCheck;
  getProposalShareUrl: () => string;
  getProposalGeneratedOn: () => string | null;
  getProposalData: () => ProposalData;
  setRenewalsFilters: (filters: Partial<RenewalsFilters>) => void;
  setRenewalsSorting: (sorting: Partial<RenewalsSorting>) => void;
  setRenewals: (renewals: RenewalRecord[]) => void;
  fetchRenewals: (caseId?: string) => Promise<void>;
  setReminder: (id: string, reminderSet: boolean) => void;
  logRenewalsEvent: (type: RenewalsEventType, payload?: Record<string, unknown>) => void;
  selectFilteredSortedRenewals: () => RenewalRecord[];
  selectWindowCounts: () => Record<RenewalWindowDays, number>;
  isReminderSet: (id: string) => boolean;
  // Returns tone and status only; components must translate labels client-side.
  getRenewalStatusChip: (status: RenewalStatus) => RenewalStatusMeta;
  // ✅ FASE 3 RENOVACIONES: Nuevas acciones CRUD
  createRenewal: (data: {
    caseId: string;
    carrier: string;
    planName: string;
    currentStartDate: string;
    currentEndDate: string;
    renewalDate: string;
    currentPremiumMinor: number;
    currency?: string;
    policyAnalysisId?: string;
    notes?: string;
  }) => Promise<RenewalRecord>;
  updateRenewal: (id: string, data: Partial<{
    carrier: string;
    planName: string;
    renewalDate: string;
    status: string;
    reminderSet: boolean;
    notes: string;
  }>) => Promise<void>;
  deleteRenewal: (id: string) => Promise<void>;
  detectRenewals: (caseId: string, daysAhead?: number) => Promise<{ created: number; skipped: number }>;
  getRenewalStats: (caseId?: string) => Promise<any>;
  // ✅ FASE 6 RENOVACIONES: Iniciar comparación desde renovación
  startRenewalComparison: (renewalId: string, policyAnalysisId?: string) => void;
  // ✅ FASE 7 RENOVACIONES: Generar propuesta desde renovación
  generateRenewalProposal: (renewalId: string, policyAnalysisId?: string) => Promise<void>;
  selectPoliciesView: () => PolicyView[];
  selectPolicyView: (policyId: string) => PolicyView | undefined;
  selectRenewalsView: () => RenewalView[];
  selectFilteredSortedRenewalsView: () => RenewalView[];
  // ✅ FASE 4: Policy Analysis Actions
  fetchPolicyAnalyses: (caseId: string) => Promise<void>;
  setPolicyAnalyses: (analyses: PolicyAnalysis[]) => void;
  setSelectedPolicyAnalysis: (analysisId: string | null) => void;
  analyzePolicyArtifact: (artifactId: string) => Promise<PolicyAnalysis>;
  selectPolicyAnalysesView: () => PolicyAnalysisView[];
  setActiveTab: (tab: WorkspaceTab) => void;
  navigateToAnalysis: (analysisId: string) => void;

  // ✅ FASE 30: Acciones de Comparación
  compareAnalyses: (analysisIds: string[]) => Promise<PolicyComparison>;
  setComparisonFilters: (filters: Partial<ComparisonFilters>) => void;
  exportComparison: (format: ComparisonExport) => Promise<Blob>;
  alignCoveragesSemantically: (caseId: string, analysisIds: string[]) => Promise<ComparisonRow[]>;
  detectCoverageGaps: (comparison: PolicyComparison) => string[];
  loadActiveComparison: (caseId: string) => Promise<void>;

  // ✅ FASE 31: Acciones de Selección de Análisis para Propuesta
  toggleAnalysisSelection: (analysisId: string) => void;
  selectAllAnalyses: () => void;
  clearAnalysisSelection: () => void;
  isAnalysisSelected: (analysisId: string) => boolean;

  // ✅ FASE 31: Acciones de Propuestas
  generateProposal: (caseId: string, comparisonId?: string, version?: 'client' | 'technical') => Promise<void>;
  loadActiveProposal: (proposalId: string) => Promise<void>;
  loadProposalByCase: (caseId: string) => Promise<void>;

  // ✅ NUEVO: Acciones de sincronización de organización
  setCurrentOrgId: (orgId: string) => void;
  resetWorkspaceState: () => void;
}

// ✅ FASE 3: Persistencia de estado (con corrección de contaminación)
const persistState = (state: Partial<UIState>) => {
  if (typeof window !== 'undefined') {
    try {
      // Obtener el ID de caso actual o del estado que se está guardando
      const currentCaseId = state.currentCaseId ?? useUI.getState().currentCaseId;

      const stateToPersist: any = {
        currentCaseId: currentCaseId,
        messages: state.messages ?? useUI.getState().messages,
        step: state.step ?? useUI.getState().step,
        // ✅ CORRECCIÓN CRÍTICA: Persistir caseApproved para que se mantenga después de navegar
        caseApproved: state.caseApproved ?? useUI.getState().caseApproved,
      };

      // ✅ FASE 3: CORRECCIÓN DE PERSISTENCIA
      // Solo persistir el 'brief' si estamos en un caso activo (NO 'new-thread-placeholder')
      if (currentCaseId && currentCaseId !== 'new-thread-placeholder') {
        stateToPersist.brief = state.brief ?? useUI.getState().brief;
      } else {
        // Si no hay caseId o es 'new-thread-placeholder', no persistir el brief para evitar contaminación.
        console.log('⏭️ [useUI] Omitiendo persistencia de brief: currentCaseId es null o new-thread-placeholder.');
      }

      localStorage.setItem('briki-ui-state', JSON.stringify(stateToPersist));
      console.log('✅ [useUI] Estado persistido:', stateToPersist);
    } catch (error) {
      console.error('❌ [useUI] Error persistiendo estado:', error);
    }
  }
};

// ✅ FASE 5: Cargar estado persistido
const loadPersistedState = (): Partial<UIState> => {
  if (typeof window !== 'undefined') {
    try {
      const persisted = localStorage.getItem('briki-ui-state');
      if (persisted) {
        const parsed = JSON.parse(persisted);
        // ✅ CORRECCIÓN CRÍTICA: Si currentCaseId es null o 'new-thread-placeholder',
        // resetear caseApproved a false para que los botones aparezcan correctamente
        if (!parsed.currentCaseId || parsed.currentCaseId === 'new-thread-placeholder') {
          parsed.caseApproved = false;
          console.log('✅ [useUI] caseApproved reseteado a false (currentCaseId es null o new-thread-placeholder)');
        }
        console.log('✅ [useUI] Estado cargado desde localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ [useUI] Error cargando estado persistido:', error);
    }
  }
  return {};
};

export const useUI = create<UIState>()(
  devtools(
    (set, get) => ({
      initialMessage: undefined,
      currentCaseId: null,
      currentOrgId: null, // ✅ NUEVO: Organización activa actual

      // ✅ NUEVO: Inicialización de auditoría de cumplimiento
      complianceAuditLog: [],

      // ✅ NUEVO: Inicialización de fase de aprobación
      approvalPhase: 'pending',

      // ✅ NUEVO: Implementación de helpers computados
      shouldShowApprovalButtons: () => {
        const { currentCaseId, caseApproving, caseResolvingClient, approvalPhase } = get();

        // ✅ REGLA SIMPLE Y DEFINITIVA (3 estados):
        // 1. VISIBLE + HABILITADO: currentCaseId es null o 'new-thread-placeholder' Y no está procesando
        // 2. VISIBLE + DESHABILITADO: está procesando (caseApproving, caseResolvingClient, approvalPhase='processing')
        // 3. INVISIBLE: currentCaseId es un UUID real (caso ya creado)
        
        // REGLA #1: Si hay un UUID real, NUNCA mostrar (caso ya creado/aprobado)
        const isNewCase = !currentCaseId || currentCaseId === 'new-thread-placeholder';
        if (!isNewCase) {
          console.log('🔍 [shouldShowApprovalButtons]: FALSE - caso ya existe (UUID):', currentCaseId);
          return false;
        }
        
        // REGLA #2: Si está en fase completed, NUNCA mostrar
        if (approvalPhase === 'completed') {
          console.log('🔍 [shouldShowApprovalButtons]: FALSE - approvalPhase=completed');
          return false;
        }
        
        // REGLA #3: Durante procesamiento, MOSTRAR pero los botones estarán deshabilitados
        // (areApprovalButtonsEnabled se encarga de deshabilitar)
        console.log('🔍 [shouldShowApprovalButtons]: TRUE - caso nuevo:', { currentCaseId, approvalPhase });
        return true;
      },

      areApprovalButtonsEnabled: () => {
        const { brief, currentCaseId, caseApproving, caseResolvingClient, approvalPhase } = get();

        // REGLA 1: Solo habilitar para casos nuevos
        const isNewCase = !currentCaseId || currentCaseId === 'new-thread-placeholder';
        if (!isNewCase) return false;
        
        // REGLA 2: Deshabilitar durante procesamiento
        if (caseApproving || caseResolvingClient || approvalPhase === 'processing') {
          return false;
        }

        // REGLA 3: El brief debe tener categoría de seguro válida
        return !!(brief.insurance_category?.trim());
      },

      dashboardViewTime: undefined,
      step: "landing",
      isSourcing: false,
      rightOpen: true,
      sidebarOpen: true,
      sidebarHovered: false,
      complianceOpen: false,
      landingDataPending: null,

      // Briefing state
      brief: {},

      // Sourcing state
      products: [],
      productsLoading: false,
      productsLoaded: false,

      // Policy state
      policies: [],
      policiesLoading: false,
      policiesLoaded: false,

      // Renewals state
      renewals: [],
      renewalsLoading: false,
      renewalsLoaded: false,
      renewalsFilters: {
        status: [],
        daysUntilRenewal: [],
        carriers: [],
      },
      renewalsSorting: {
        sortBy: 'renewalDate',
        sortDir: 'asc',
      },
      renewalsAuditLog: [],
      renewalsSequence: 0,

      // Chat state
      messages: [],

      // Policy Analysis state
      policyAnalyses: [],
      policyAnalysesLoading: false,
      policyAnalysesLoaded: false,
      selectedPolicyAnalysisId: null,
      selectedFieldName: null,
      activeTab: 'policies', // ✅ Default tab

      complianceJurisdiction: complianceJurisdictions[0] ?? "co",
      checked: createDefaultComplianceChecked(),
      activeComplianceRecord: null,
      complianceLoading: false,
      complianceKycStatus: null,
      complianceValidationErrors: [],
      complianceStartDate: undefined,
      complianceEndDate: undefined,
      selectedCompliancePolicyId: null, // ✅ FASE 1: Póliza seleccionada

      followupCadenceDays: [30, 60, 90],
      followupAuditLog: [],

      // ✅ FASE 21 & 22: Inicialización
      pdfNavigationTarget: undefined,
      selectedField: undefined,
      _pendingPolicyAnalysis: new Set(),

      // ✅ FASE 30: Inicialización de Comparación
      activeComparison: null,
      comparisonLoading: false,
      comparisonFilters: {
        categories: [],
        onlyDifferences: false,
        onlyMandatory: false,
        searchQuery: "",
      },

      // ✅ FASE 31: Inicialización de selección de análisis
      selectedAnalysisIds: new Set<string>(),

      // Función de validación unificada del brief
      isBriefValid: () => {
        const { brief } = get();
        // Solo la categoría de seguro es obligatoria
        return !!(brief.insurance_category?.trim());
      },
      setInitialMessage: (message: string) => set({ initialMessage: message }),  // ✅ Implementación
      clearInitialMessage: () => set({ initialMessage: "" }),                  // ✅ Implementación simple
      setCurrentCaseId: (id: string | null) => {
        set((state) => {
          const newState = { ...state, currentCaseId: id };
          persistState(newState);
          return newState;
        });
      },
      setDashboardViewTime: (timestamp: number) => set({ dashboardViewTime: timestamp }), // ✅ AÑADIDO
      setStep: (step) =>
        set((state) => {
          if (state.isSourcing && step !== "conversation") {
            return {};
          }
          const newState = { ...state, step };
          persistState(newState);
          return newState;
        }),
      // Función para aprobación de casos
      approveCurrentCase: async (clientId?: string | null) => {
        const { brief, currentCaseId, startSourcing } = get();

        console.log('🔍 DEBUG approveCurrentCase:', {
          currentCaseId,
          brief,
          clientId,
          briefKeys: Object.keys(brief || {}),
          briefValues: brief
        });

        if (!currentCaseId) {
          console.error('❌ No currentCaseId found');
          set({ caseApprovalError: 'No active case selected.' });
          return false;
        }

        // ✅ CORRECCIÓN CRÍTICA: Establecer caseApproving ANTES de esperar
        // Esto permite que BriefForm detecte el cambio y sincronice formData con brief global
        set({ caseApproving: true, caseApprovalError: null });

        // ✅ CORRECCIÓN CRÍTICA: Esperar un momento para que BriefForm sincronice formData con brief global
        // BriefForm tiene un useEffect que detecta caseApproving y sincroniza automáticamente
        await new Promise(resolve => setTimeout(resolve, 150));

        // ✅ CORRECCIÓN CRÍTICA: Obtener brief actualizado después de la sincronización
        const updatedBrief = get().brief;
        console.log('📋 [approveCurrentCase] Brief actualizado después de sincronización:', updatedBrief);

        try {
          // ✅ CORRECCIÓN CRÍTICA: Asegurar que brief tenga todos los campos necesarios
          // Usar updatedBrief que ya tiene todos los datos sincronizados desde BriefForm
          const completeBriefData = {
            ...updatedBrief,
            selectedClientId: clientId ?? updatedBrief.selectedClientId ?? null,
            clientName: updatedBrief.clientName ?? null,
            businessType: updatedBrief.businessType ?? null,
            insurance_category: updatedBrief.insurance_category ?? null,
            max_budget: updatedBrief.max_budget ?? null,
            employees: updatedBrief.employees ?? null,
            client_profile: updatedBrief.client_profile ?? null,
            required_coverages: updatedBrief.required_coverages ?? [],
            budget_currency: updatedBrief.budget_currency ?? 'COP',
            coverage: updatedBrief.coverage ?? null,
            freeText: updatedBrief.freeText ?? null,
          };

          console.log('🚀 Calling /api/cases/approve with:', { caseId: currentCaseId, briefData: completeBriefData });

          const response = await fetch('/api/cases/approve', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caseId: currentCaseId,
              briefData: completeBriefData // ✅ CORRECCIÓN: Usar brief completo con todos los campos
            }),
          });

          console.log('📡 API Response status:', response.status);

          if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            throw new Error(errorData.error || 'Failed to approve case');
          }

          const result = await response.json();
          console.log('✅ API Success:', result);

          // Si la API tiene éxito, activa el flujo de sourcing en la UI
          set((state) => {
            const newState = { ...state, caseApproved: true, caseApproving: false };
            // ✅ CORRECCIÓN CRÍTICA: Persistir caseApproved inmediatamente después de aprobar
            persistState(newState);
            return newState;
          });

          // Añadir el mensaje automático del usuario a la UI inmediatamente
          const autoMessageContent = brief.freeText || "Por favor, analiza este caso y proporciona recomendaciones de seguros.";
          const userAutoMessage: ChatMessage = {
            id: `auto-${Date.now()}`,
            role: "user",
            content: autoMessageContent,
            createdAt: Date.now(),
          };
          get().addMessage(userAutoMessage);

          // Activar sourcing y enviar mensaje automático
          get().startSourcing();
          await get().sendAutoMessage(autoMessageContent);

          return true;

        } catch (error: any) {
          console.error('❌ approveCurrentCase error:', error);
          set({ caseApproving: false, caseApprovalError: error.message });
          return false;
        }
      },
      resetApprovalStatus: () => {
        set((state) => {
          const newState = { ...state, caseApproved: false };
          persistState(newState);
          return newState;
        });
      },
      setCaseApproved: (isApproved) => {
        set((state) => {
          // ✅ CORRECCIÓN CRÍTICA: Sincronizar approvalPhase con caseApproved
          // Si isApproved=true -> 'completed', si false -> 'pending'
          const newPhase: ApprovalPhase = isApproved ? 'completed' : 'pending';

          // ✅ REGLA DE NEGOCIO: Si caseApproved ya es true, NUNCA puede volverse false
          // EXCEPCIÓN: Si estamos en new-thread-placeholder
          if (state.caseApproved === true && isApproved === false) {
            const isNewThreadPlaceholder = !state.currentCaseId || state.currentCaseId === 'new-thread-placeholder';

            if (isNewThreadPlaceholder) {
              console.log('✅ [useUI] Permitiendo reset de caseApproved (new-thread-placeholder detectado)');
            } else {
              console.warn('⚠️ [useUI] Intento de resetear caseApproved a false cuando ya es true - BLOQUEADO (regla de negocio)');
              return state;
            }
          }

          const newState = {
            ...state,
            caseApproved: isApproved,
            approvalPhase: newPhase // ✅ Sincronización bidireccional
          };
          persistState(newState);
          return newState;
        });
      },

      // ✅ NUEVO: Método para establecer fase de aprobación explícitamente
      setApprovalPhase: (phase: ApprovalPhase) => {
        set((state) => {
          // Sincronizar estados legacy para compatibilidad
          const isApproved = phase === 'completed';
          const isApproving = phase === 'processing';

          const newState = {
            ...state,
            approvalPhase: phase,
            caseApproved: isApproved,
            caseApproving: isApproving,
          };
          persistState(newState);
          return newState;
        });
      },
      // Funciones para manejo de mensajes del chat
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, { ...message, id: message.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, createdAt: message.createdAt || Date.now() }]
      })),
      setMessages: (messages) => {
        set((state) => {
          const newState = { ...state, messages };
          persistState(newState);
          return newState;
        });
      },
      // Función para validación y aprobación de clientes (removida para evitar bucles infinitos)
      // validateAndApproveClient: async () => {
      //   console.warn('validateAndApproveClient called but not implemented in store. This should be called from ConversationPane.');
      //   return false;
      // },
      // setValidateAndApproveClient: (fn) => set({ validateAndApproveClient: fn }),
      // Función para enviar mensaje automático después de aprobar
      sendAutoMessage: async (message: string) => {
        const { currentCaseId, brief, addMessage } = get();

        if (!currentCaseId) {
          console.error('No currentCaseId found for auto message');
          return;
        }

        try {
          const response = await fetch('/api/chat/process-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: message,
              brief: brief,
              caseId: currentCaseId
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'API request failed');
          }

          const result = await response.json();
          console.log('✅ Auto message processed, agent response received:', result);

          // Añadir la respuesta del AGENTE a la UI
          const agentResponseMessage: ChatMessage = {
            id: `agent-${Date.now()}`,
            role: "assistant",
            content: result.response || result.message || "Análisis completado",
            createdAt: Date.now(),
            agent: { label: "Sourcing" }
          };
          addMessage(agentResponseMessage);

        } catch (error: any) {
          console.error('Error sending auto message or processing response:', error);
          // Añadir mensaje de error al chat
          addMessage({
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Error al procesar: ${error.message}`,
            createdAt: Date.now(),
            agent: { label: "Error" }
          });
        }
      },
      // Funciones para el flujo de briefing
      startBriefing: (initialMessage: string) =>
        set(() => ({
          briefingCase: { isActive: true, initialMessage },
          step: "landing" // Mantener en landing para mostrar el formulario
        })),
      completeBriefing: (caseId: string) =>
        set(() => ({
          briefingCase: null,
          currentCaseId: caseId,
          step: "conversation"
        })),
      cancelBriefing: () =>
        set(() => ({
          briefingCase: null,
          step: "landing"
        })),
      toggleRightPanel: () => set((state) => ({ rightOpen: !state.rightOpen })),
      openChatPanel: () => set(() => ({ chatPanelOpen: true })),
      closeChatPanel: () => set(() => ({ chatPanelOpen: false })),
      // Funciones del sidebar
      setSidebarOpen: (open) => set(() => ({ sidebarOpen: open })),
      setSidebarHovered: (hovered) => set(() => ({ sidebarHovered: hovered })),
      // ✅ FASE 32: Compliance Actions Implementation
      loadComplianceRecord: async (caseId: string) => {
        console.log('🔍 [state.ts] loadComplianceRecord called with caseId:', caseId);
        if (!caseId || caseId === 'new-thread-placeholder') {
          console.log('🛑 [state.ts] Skipping compliance load for invalid/placeholder caseId');
          return;
        }
        set({ complianceLoading: true, complianceValidationErrors: [] });
        try {
          const response = await fetch(`/api/compliance/records/${caseId}`);
          if (response.status === 404) {
            console.warn('⚠️ [state.ts] Compliance record not found (404)');
            set({ activeComplianceRecord: null, complianceLoading: false });
            return;
          }
          if (!response.ok) {
            throw new Error(`Failed to load compliance record: ${response.status}`);
          }

          const record: ComplianceRecord = await response.json();

          if (!record) {
            console.warn('⚠️ [state.ts] Compliance record is null/empty despite 200 OK');
            set({ activeComplianceRecord: null, complianceLoading: false });
            return;
          }

          // Sincronizar estado local 'checked' con los datos de BD
          const syncedChecked = { ...get().checked };

          if (record.checklistData) {
            Object.entries(record.checklistData).forEach(([itemId, data]) => {
              const jurisdiction = record.jurisdiction;
              if (jurisdiction && complianceChecklistItems[jurisdiction]?.includes(itemId)) {
                if (!syncedChecked[jurisdiction]) {
                  syncedChecked[jurisdiction] = {};
                }
                syncedChecked[jurisdiction][itemId] = (data as any).checked;
              }
            });
          }

          set({
            activeComplianceRecord: record,
            checked: syncedChecked,
            complianceLoading: false,
            complianceKycStatus: record.kycStatus || null,
            complianceJurisdiction: record.jurisdiction,
            // Hydrate dates from validatedDates field
            complianceStartDate: (record.validatedDates as any)?.startDate || undefined,
            complianceEndDate: (record.validatedDates as any)?.endDate || undefined,
          });

        } catch (error) {
          console.error("Error loading compliance record:", error);
          toast.error("Error al cargar estado de cumplimiento");
          set({ complianceLoading: false });
        }
      },

      updateComplianceItem: async (itemId: string, checked: boolean) => {
        const { currentCaseId, complianceJurisdiction, activeComplianceRecord } = get();

        if (!currentCaseId) {
          console.warn('⚠️ [updateComplianceItem] No currentCaseId, cannot save');
          return;
        }
        
        if (!complianceJurisdiction) {
          console.warn('⚠️ [updateComplianceItem] No jurisdiction set');
          return;
        }

        // 1. Optimistic Update (Local State)
        const previousChecked = get().checked;

        set((state) => {
          const currentJurisdictionState = state.checked[complianceJurisdiction] ?? {};
          return {
            checked: {
              ...state.checked,
              [complianceJurisdiction]: {
                ...currentJurisdictionState,
                [itemId]: checked,
              },
            }
          };
        });

        const currentJurisdictionState = get().checked[complianceJurisdiction] ?? {};
        const existingChecklistData = activeComplianceRecord?.checklistData ?? {};

        const payloadChecklistData = {
          ...existingChecklistData,
          [itemId]: {
            checked,
            verifiedBy: "user",
            updatedAt: new Date().toISOString()
          }
        };

        try {
          console.log('💾 [updateComplianceItem] Saving to API:', {
            caseId: currentCaseId,
            jurisdiction: complianceJurisdiction,
            itemId,
            checked
          });
          
          // Usar PUT con caseId en la URL - el backend hace upsert si no existe
          const response = await fetch(`/api/compliance/records/${currentCaseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jurisdiction: complianceJurisdiction,
              checklistData: payloadChecklistData
            })
          });

          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('❌ [updateComplianceItem] API error:', response.status, errorText);
            
            // Mensajes específicos según código de error
            if (response.status === 403) {
              throw new Error('NO_ACCESS');
            } else if (response.status === 404) {
              throw new Error('CASE_NOT_FOUND');
            } else {
              throw new Error(`SAVE_FAILED:${response.status}`);
            }
          }

          const updatedRecord = await response.json();
          console.log('✅ [updateComplianceItem] Saved successfully');
          set({ activeComplianceRecord: updatedRecord });

        } catch (error) {
          console.error("❌ [updateComplianceItem] Error:", error);
          
          // Mostrar mensaje apropiado según tipo de error
          const errorMessage = error instanceof Error ? error.message : 'Unknown';
          if (errorMessage === 'NO_ACCESS') {
            toast.error("No tienes acceso a este caso en la organización actual");
          } else if (errorMessage === 'CASE_NOT_FOUND') {
            toast.error("El caso no fue encontrado");
          } else {
            toast.error("No se pudo guardar el cambio. Intenta de nuevo.");
          }
          
          // Revertir al estado anterior
          set({ checked: previousChecked });
        }
      },

      validateComplianceDates: async (start: string, end: string) => {
        const { currentCaseId } = get();
        if (!currentCaseId) return;

        set({ complianceLoading: true, complianceValidationErrors: [] });

        try {
          const response = await fetch('/api/compliance/validate-dates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              startDate: start,
              endDate: end,
              caseId: currentCaseId
            })
          });

          // ✅ FASE 38: Check response status before parsing
          if (!response.ok) {
            throw new Error(`Validation failed: ${response.status}`);
          }

          const data = await response.json();

          if (!data.valid) {
            set({
              complianceValidationErrors: data.errors || ["Fechas inválidas"],
              complianceLoading: false
            });
            // ✅ FASE 38: Defer toast to avoid hooks mismatch
            setTimeout(() => toast.error("Validación de fechas fallida"), 0);
          } else {
            set({
              complianceValidationErrors: [],
              complianceLoading: false
            });
            // ✅ FASE 38: Defer toast to avoid hooks mismatch
            setTimeout(() => toast.success("Fechas validadas correctamente"), 0);

            // Trigger auto-save
            get().saveComplianceRecord();
          }

        } catch (error) {
          console.error("Error validating dates:", error);
          set({
            complianceValidationErrors: ["Error de conexión"],
            complianceLoading: false
          });
          // ✅ FASE 38: Defer toast to avoid hooks mismatch
          setTimeout(() => toast.error("Error al validar fechas"), 0);
        }
      },

      verifyKyc: async () => {
        const { currentCaseId, activeComplianceRecord } = get();
        if (!currentCaseId || !activeComplianceRecord) return;

        set({ complianceLoading: true });

        // Delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 800));

        set({
          activeComplianceRecord: { ...activeComplianceRecord, kycStatus: "verified" },
          complianceKycStatus: "verified",
          complianceLoading: false
        });
        toast.success("KYC Verificado correctamente");

        // Trigger auto-save after KYC verification
        const { saveComplianceRecord } = get();
        saveComplianceRecord();
      },

      saveComplianceRecord: async () => {
        const { currentCaseId, activeComplianceRecord, checked, complianceKycStatus, complianceStartDate, complianceEndDate } = get();

        if (!currentCaseId || !activeComplianceRecord) {
          console.warn('⚠️ [state.ts] Cannot save compliance: No active record or case ID');
          return;
        }

        const checklistData: Record<string, any> = {};
        const jurisdiction = activeComplianceRecord.jurisdiction;

        if (jurisdiction && checked[jurisdiction]) {
          Object.entries(checked[jurisdiction]).forEach(([itemId, isChecked]) => {
            checklistData[itemId] = { checked: isChecked, timestamp: Date.now() };
          });
        }

        try {
          const response = await fetch(`/api/compliance/records/${currentCaseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              checklistData,
              kycStatus: complianceKycStatus, // Persist current KYC status
              policyStartDate: complianceStartDate,
              policyEndDate: complianceEndDate
            })
          });

          if (!response.ok) {
            throw new Error(`Failed to auto-save compliance: ${response.status}`);
          }

          console.log('✅ [state.ts] Compliance record auto-saved successfully');

        } catch (error) {
          console.error('❌ [state.ts] Error saving compliance record:', error);
          toast.error("Error al guardar cambios de cumplimiento");
        }
      },

      // ✅ FASE 1: Seleccionar póliza para validación de compliance
      setSelectedCompliancePolicyId: (policyId: string | null) => {
        const { policyAnalyses } = get();
        
        set({ selectedCompliancePolicyId: policyId });
        
        // Si se selecciona una póliza, hidratar sus fechas automáticamente
        if (policyId) {
          const selectedAnalysis = policyAnalyses.find(a => a.id === policyId);
          if (selectedAnalysis) {
            const data = selectedAnalysis.extractedData as Record<string, any>;
            
            // Buscar fechas con múltiples nombres posibles
            const startDate = data?.effective_from || data?.effectiveDate || 
                             data?.startDate || data?.fechaInicio || data?.vigenciaDesde;
            const endDate = data?.effective_to || data?.expirationDate || 
                           data?.endDate || data?.fechaFin || data?.vigenciaHasta;
            
            if (startDate && endDate) {
              const formatDate = (dateStr: string): string => {
                try {
                  const date = new Date(dateStr);
                  if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0] ?? dateStr;
                  }
                } catch {}
                return dateStr;
              };
              
              set({
                complianceStartDate: formatDate(startDate),
                complianceEndDate: formatDate(endDate)
              });
              
              console.log('✅ [setSelectedCompliancePolicyId] Hydrated dates from policy:', policyId);
              toast.success('Fechas de vigencia cargadas desde póliza seleccionada');
            } else {
              // Limpiar fechas si la póliza no tiene - usar string vacío en lugar de undefined
              set({
                complianceStartDate: '',
                complianceEndDate: ''
              });
              console.log('⚠️ [setSelectedCompliancePolicyId] No dates in selected policy');
            }
          }
        }
      },

      // ✅ CORRECCIÓN: Auto-hidratar fechas de vigencia desde pólizas analizadas
      // Esto se llama cuando se activa el tab de Compliance para pre-llenar las fechas
      hydrateComplianceDatesFromPolicies: () => {
        const { policyAnalyses, complianceStartDate, complianceEndDate, selectedCompliancePolicyId } = get();
        
        // Si ya hay fechas configuradas, no sobrescribir
        if (complianceStartDate && complianceEndDate) {
          console.log('ℹ️ [hydrateComplianceDates] Dates already set, skipping');
          return;
        }
        
        // Si hay una póliza seleccionada, usar esa; si no, buscar la primera con fechas
        const targetAnalyses = selectedCompliancePolicyId 
          ? policyAnalyses.filter(a => a.id === selectedCompliancePolicyId)
          : policyAnalyses;
        
        // Buscar póliza con fechas de vigencia
        for (const analysis of targetAnalyses) {
          const data = analysis.extractedData as Record<string, any>;
          
          // Buscar fechas con múltiples nombres posibles (del prompt de IA)
          const startDate = data?.effective_from || data?.effectiveDate || 
                           data?.startDate || data?.fechaInicio || data?.vigenciaDesde;
          const endDate = data?.effective_to || data?.expirationDate || 
                         data?.endDate || data?.fechaFin || data?.vigenciaHasta;
          
          if (startDate && endDate) {
            // Convertir a formato YYYY-MM-DD para inputs date
            const formatDate = (dateStr: string): string => {
              try {
                const date = new Date(dateStr);
                if (!isNaN(date.getTime())) {
                  return date.toISOString().split('T')[0] ?? dateStr;
                }
              } catch {}
              return dateStr;
            };
            
            const formattedStart = formatDate(startDate);
            const formattedEnd = formatDate(endDate);
            
            console.log('✅ [hydrateComplianceDates] Found dates in policy:', {
              startDate: formattedStart,
              endDate: formattedEnd,
              source: analysis.id
            });
            
            set({
              complianceStartDate: formattedStart,
              complianceEndDate: formattedEnd,
              selectedCompliancePolicyId: analysis.id // Auto-seleccionar la póliza usada
            });
            
            toast.success('Fechas de vigencia detectadas automáticamente');
            return;
          }
        }
        
        console.log('⚠️ [hydrateComplianceDates] No dates found in any policy analysis');
      },

      openCompliance: (jurisdiction) =>
        set((state) => {
          const event: LocalComplianceEvent = {
            type: "ComplianceOpen",
            ts: Date.now(),
            payload: { jurisdiction },
          };
          return {
            complianceOpen: true,
            complianceJurisdiction: jurisdiction,
            checked: ensureComplianceCheckedForJurisdiction(state.checked, jurisdiction),
            complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, event),
          };
        }),
      closeCompliance: () => set(() => ({ complianceOpen: false })),
      toggleCompliance: (itemId) => {
        set((state) => {
          const jurisdiction = state.complianceJurisdiction;
          const items = complianceChecklistItems[jurisdiction];
          if (!items?.includes(itemId)) {
            return {};
          }

          const currentJurisdictionState = state.checked[jurisdiction] ?? {};
          const nextValue = !Boolean(currentJurisdictionState[itemId]);
          const nextChecked: ComplianceCheckedState = {
            ...state.checked,
            [jurisdiction]: {
              ...currentJurisdictionState,
              [itemId]: nextValue,
            },
          };

          return {
            checked: nextChecked,
            complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, {
              type: "ChecklistToggle",
              ts: Date.now(),
              payload: { jurisdiction, itemId, checked: nextValue },
            }),
          };
        });

        // Trigger auto-save
        get().saveComplianceRecord();
      },
      passCompliance: (jurisdiction) =>
        set((state) => {
          const items = complianceChecklistItems[jurisdiction];
          if (!items) {
            return {};
          }

          const nextJurisdictionState = items.reduce<Record<ComplianceItemId, boolean>>((acc, item) => {
            acc[item] = true;
            return acc;
          }, {});

          return {
            checked: {
              ...state.checked,
              [jurisdiction]: nextJurisdictionState,
            },
            complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, {
              type: "CompliancePass",
              ts: Date.now(),
              payload: { jurisdiction },
            }),
          };
        }),
      resetCompliance: (jurisdiction) =>
        set((state) => {
          const targets = jurisdiction ? [jurisdiction] : complianceJurisdictions;
          let nextChecked = state.checked;
          let nextLog = state.complianceAuditLog;
          let updated = false;

          for (const target of targets) {
            const items = complianceChecklistItems[target];
            if (!items) continue;

            const resetState = items.reduce<Record<ComplianceItemId, boolean>>((acc, item) => {
              acc[item] = false;
              return acc;
            }, {});

            if (!shallowEqualComplianceState(state.checked[target], resetState)) {
              updated = true;
              nextChecked = {
                ...nextChecked,
                [target]: resetState,
              };
            }

            nextLog = appendComplianceEvent(nextLog, {
              type: "ChecklistToggle",
              ts: Date.now(),
              payload: { jurisdiction: target, reset: true },
            });
          }

          if (!updated && nextLog === state.complianceAuditLog) {
            return {};
          }

          return {
            checked: updated ? nextChecked : state.checked,
            complianceAuditLog: nextLog,
          };
        }),
      isCompliancePassed: (jurisdiction) => {
        const items = complianceChecklistItems[jurisdiction];
        if (!items?.length) return false;
        const checked = get().checked[jurisdiction];
        if (!checked) return false;
        return items.every((item) => Boolean(checked[item]));
      },
      logComplianceSendAttempt: (payload) =>
        set((state) => {
          const event: LocalComplianceEvent = {
            type: "SendAttempt",
            ts: Date.now(),
          };
          if (payload !== undefined) {
            event.payload = payload;
          }
          return {
            complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, event),
          };
        }),
      logComplianceSendBlocked: (payload) =>
        set((state) => {
          const event: LocalComplianceEvent = {
            type: "SendBlocked",
            ts: Date.now(),
          };
          if (payload !== undefined) {
            event.payload = payload;
          }
          return {
            complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, event),
          };
        }),
      logComplianceSendSuccess: (payload) =>
        set((state) => {
          const event: LocalComplianceEvent = {
            type: "SendSuccess",
            ts: Date.now(),
          };
          if (payload !== undefined) {
            event.payload = payload;
          }
          return {
            complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, event),
          };
        }),
      primaryAction: () => {
        // For now just log the current step as requested
        // eslint-disable-next-line no-console
        console.log("Primary action on step:", get().step);
      },
      startSourcing: () => set(() => ({ isSourcing: true, step: "conversation" })),
      stopSourcing: () => set(() => ({ isSourcing: false })),
      // ✅ FASE 1: Setter para landingDataPending (NO se persiste en localStorage)
      setLandingDataPending: (data) => set({ landingDataPending: data }),
      setBrief: (brief) => {
        set((state) => {
          // ✅ CORRECCIÓN CRÍTICA: Evitar actualizaciones innecesarias
          const newBrief = { ...state.brief, ...brief };
          if (JSON.stringify(state.brief) === JSON.stringify(newBrief)) {
            return state; // No hay cambios, retornar estado actual
          }
          const newState = { ...state, brief: newBrief };
          persistState(newState);
          return newState;
        });
      },
      setFollowupCadenceDays: (days) =>
        set((state) => {
          const next = sanitizeFollowupCadenceDays(days);
          if (arraysEqual(state.followupCadenceDays, next)) {
            return {};
          }
          return {
            followupCadenceDays: next,
            followupAuditLog: appendFollowupEvent(state.followupAuditLog, next),
          } satisfies Partial<UIState>;
        }),
      addFollowupDay: (day) =>
        set((state) => {
          const next = sanitizeFollowupCadenceDays([...state.followupCadenceDays, day]);
          if (arraysEqual(state.followupCadenceDays, next)) {
            return {};
          }
          return {
            followupCadenceDays: next,
            followupAuditLog: appendFollowupEvent(state.followupAuditLog, next),
          } satisfies Partial<UIState>;
        }),
      removeFollowupDay: (day) =>
        set((state) => {
          const filtered = state.followupCadenceDays.filter((value) => value !== day);
          const next = sanitizeFollowupCadenceDays(filtered);
          if (arraysEqual(state.followupCadenceDays, next)) {
            return {};
          }
          return {
            followupCadenceDays: next,
            followupAuditLog: appendFollowupEvent(state.followupAuditLog, next),
          } satisfies Partial<UIState>;
        }),
      followupCadenceLabel: () => formatFollowupCadence(get().followupCadenceDays),
      setPolicies: (policies) =>
        set((state) => ({
          policies,
          policiesLoaded: true,
          policiesLoading: false,
          comparisonScores: computeComparisonScores(policies, state.comparisonWeights),
          _cachedPoliciesView: policies.map(policyToView), // Update cache when policies change
        })),
      fetchPolicies: async () => {
        const { policiesLoading, policiesLoaded } = get();
        if (policiesLoading || policiesLoaded) {
          return;
        }
        set(() => ({ policiesLoading: true }));
        try {
          const policies = await loadPolicies();
          get().setPolicies(policies);
        } catch (error) {
          set(() => ({ policiesLoading: false }));
          throw error;
        }
      },
      fetchProducts: async () => {
        const { productsLoading, productsLoaded } = get();
        if (productsLoading || productsLoaded) {
          return;
        }
        set(() => ({ productsLoading: true } satisfies Partial<UIState>));
        try {
          const products = await loadProducts();
          set(() => ({ products, productsLoaded: true, productsLoading: false } satisfies Partial<UIState>));
        } catch (error) {
          set(() => ({ products: [], productsLoaded: false, productsLoading: false } satisfies Partial<UIState>));
          throw error;
        }
      },
      fetchRiders: async () => {
        const { ridersLoading, ridersLoaded } = get();
        if (ridersLoading || ridersLoaded) {
          return;
        }
        set(() => ({ ridersLoading: true } satisfies Partial<UIState>));
        try {
          const riders = await loadRiders();
          set(() => ({ riders, ridersLoaded: true, ridersLoading: false } satisfies Partial<UIState>));
        } catch (error) {
          set(() => ({ riders: [], ridersLoaded: false, ridersLoading: false } satisfies Partial<UIState>));
          throw error;
        }
      },
      fetchPricingBands: async () => {
        const { pricingBandsLoading, pricingBandsLoaded } = get();
        if (pricingBandsLoading || pricingBandsLoaded) {
          return;
        }
        set(() => ({ pricingBandsLoading: true } satisfies Partial<UIState>));
        try {
          const pricingBands = await loadPricingBands();
          set(() => ({ pricingBands, pricingBandsLoaded: true, pricingBandsLoading: false } satisfies Partial<UIState>));
        } catch (error) {
          set(() => ({ pricingBands: [], pricingBandsLoaded: false, pricingBandsLoading: false } satisfies Partial<UIState>));
          throw error;
        }
      },

      fetchEligibilities: async () => {
        const { eligibilitiesLoading, eligibilitiesLoaded } = get();
        if (eligibilitiesLoading || eligibilitiesLoaded) {
          return;
        }
        set(() => ({ eligibilitiesLoading: true } satisfies Partial<UIState>));
        try {
          const eligibilities = await loadEligibilities();
          set(() => ({ eligibilities, eligibilitiesLoaded: true, eligibilitiesLoading: false } satisfies Partial<UIState>));
        } catch (error) {
          set(() => ({ eligibilities: [], eligibilitiesLoaded: false, eligibilitiesLoading: false } satisfies Partial<UIState>));
          throw error;
        }
      },
      fetchProvenance: async () => {
        const { provenanceLoading, provenanceLoaded } = get();
        if (provenanceLoading || provenanceLoaded) {
          return;
        }
        set(() => ({ provenanceLoading: true } satisfies Partial<UIState>));
        try {
          const provenance = await loadProvenance();
          set(() => ({ provenance, provenanceLoaded: true, provenanceLoading: false } satisfies Partial<UIState>));
        } catch (error) {
          set(() => ({ provenance: [], provenanceLoaded: false, provenanceLoading: false } satisfies Partial<UIState>));
          throw error;
        }
      },
      fetchCases: async (force = false) => {
        const { casesLoading, casesLoaded } = get();
        // ✅ OPTIMIZACIÓN: Si ya está cargando, no iniciar otra carga (evitar duplicados)
        if (casesLoading && !force) {
          console.log('⏭️ [fetchCases] Ya está cargando, omitiendo...');
          return;
        }
        // ✅ OPTIMIZACIÓN: Si ya está cargado y no se fuerza, no recargar
        if (!force && casesLoaded) {
          console.log('⏭️ [fetchCases] Ya está cargado, omitiendo (usa refreshCases para forzar)');
          return;
        }
        set(() => ({ casesLoading: true, casesLoaded: false } satisfies Partial<UIState>));
        try {
          // Usar API route para evitar problemas de server/client components
          const response = await fetch('/api/cases');
          if (!response.ok) {
            throw new Error(`Failed to fetch cases: ${response.statusText
              }`);
          }
          const data = await response.json();
          console.log('✅ [fetchCases] Loaded cases:', data.cases.length);
          set(() => ({ cases: data.cases, casesLoaded: true, casesLoading: false } satisfies Partial<UIState>));
        } catch (error) {
          console.error("❌ [fetchCases] Error loading cases:", error);
          set(() => ({ cases: [], casesLoaded: false, casesLoading: false } satisfies Partial<UIState>));
        }
      },
      // ✅ NUEVA FUNCIÓN: refreshCases - Fuerza recarga inmediata de cases
      refreshCases: async () => {
        console.log('🔄 [refreshCases] Forzando recarga de cases...');
        await get().fetchCases(true);
      },
      setComparisonWeights: (weights) =>
        set((state) => computeNextComparisonState(state, weights)),
      resetComparisonWeights: () =>
        set((state) => computeNextComparisonState(state, defaultComparisonWeights, state.comparisonPlaybook, true)),
      setComparisonPlaybook: (playbook) =>
        set((state) => computeNextComparisonState(state, playbookPresets[playbook], playbook, true)),
      scorePolicy: (policy, weights) => {
        const activeWeights = weights ?? get().comparisonWeights;
        return computeComparisonScores([policy], activeWeights)[0] ?? {
          plan: policy.plan,
          total: 0,
          breakdown: createEmptyBreakdown(),
        };
      },
      setProposalBrokerProfile: (profile) =>
        set((state) => ({
          proposalBrokerProfile: sanitizeBrokerProfile(state.proposalBrokerProfile, profile),
        })),
      setProposalSelectedPlans: (plans) =>
        set(() => ({
          proposalSelectedPlans: sanitizeSelectedPlans(plans),
        })),
      setProposalDisclosuresKeys: (keys) =>
        set(() => ({ proposalDisclosuresKeys: sanitizeDisclosureKeys(keys) })),
      addProposalDisclosureKey: (key) =>
        set((state) => {
          const next = sanitizeDisclosureKeys([...state.proposalDisclosuresKeys, key]);
          return next.length === state.proposalDisclosuresKeys.length
            ? {}
            : { proposalDisclosuresKeys: next };
        }),
      clearProposalDisclosures: () =>
        set(() => ({ proposalDisclosuresKeys: [...defaultProposalDisclosuresKeys] })),
      setProposalMathCheck: (mathCheck) =>
        set(() => ({ proposalMathCheck: sanitizeMathCheck(mathCheck) })),
      setProposalShareUrl: (url) => set(() => ({ proposalShareUrl: sanitizeShareUrl(url) })),
      setProposalLoading: (loading) => set(() => ({ proposalLoading: Boolean(loading) })),
      setProposalGeneratedOn: (date) =>
        set(() => ({ proposalGeneratedOn: asTrimmedString(date) ?? null })),
      getProposalBrokerProfile: () => get().proposalBrokerProfile,
      getProposalBrief: () => get().brief,
      getProposalSelectedPlans: () => get().proposalSelectedPlans,
      getProposalDisclosuresKeys: () => get().proposalDisclosuresKeys,
      getProposalMathCheck: () => get().proposalMathCheck,
      getProposalShareUrl: () => get().proposalShareUrl,
      getProposalGeneratedOn: () => get().proposalGeneratedOn,
      getProposalData: () => ({
        broker: get().proposalBrokerProfile,
        brief: get().brief,
        selectedPlans: get().proposalSelectedPlans,
        disclosuresKeys: get().proposalDisclosuresKeys,
        mathCheck: get().proposalMathCheck,
        shareUrl: get().proposalShareUrl,
        generatedOn: get().proposalGeneratedOn,
      }),
      setRenewals: (renewals) =>
        set((state) => {
          const renewalsView = renewals.map(renewalToView);
          const filtered = computeFilteredSortedRenewals({ ...state, renewals });
          const filteredView = filtered.map(renewalToView);
          return {
            renewals,
            renewalsLoaded: true,
            renewalsLoading: false,
            _cachedRenewalsView: renewalsView, // Update cache when renewals change
            _cachedFilteredRenewalsView: filteredView, // Update filtered cache
          };
        }),

      // ✅ FASE 30: Implementación de Acciones de Comparación
      compareAnalyses: async (analysisIds) => {
        set({ comparisonLoading: true });
        try {
          // TODO: FASE 30.2 - Implementar endpoint real
          // const response = await fetch('/api/comparisons/align', { ... });
          // const comparison = await response.json();

          // MOCK TEMPORAL para evitar crash
          const mockComparison: PolicyComparison = {
            id: `comp - ${Date.now()}`,
            caseId: get().currentCaseId || '',
            analysisIds,
            rows: [],
            alignmentMethod: 'semantic',
            filters: get().comparisonFilters,
            createdAt: new Date().toISOString(),
          };

          set({ activeComparison: mockComparison, comparisonLoading: false });
          return mockComparison;
        } catch (error) {
          console.error('❌ Error comparing analyses:', error);
          set({ comparisonLoading: false });
          throw error;
        }
      },

      setComparisonFilters: (filters) => {
        set((state) => ({
          comparisonFilters: { ...state.comparisonFilters, ...filters }
        }));
      },

      loadActiveComparison: async (caseId) => {
        set({ comparisonLoading: true });
        try {
          const response = await fetch(`/api/comparisons/by-case/${caseId}`);
          if (!response.ok) {
            if (response.status === 404) {
              set({ activeComparison: null, comparisonLoading: false });
              return;
            }
            throw new Error("Failed to load comparison");
          }

          const data = await response.json();
          if (data.comparison) {
            set({
              activeComparison: data.comparison,
              comparisonLoading: false
            });
            // Optional: toast.success("Comparación cargada correctamente");
          } else {
            set({ activeComparison: null, comparisonLoading: false });
          }
        } catch (error) {
          console.error("Error loading comparison:", error);
          toast.error("Error al cargar la comparación guardada");
          set({ comparisonLoading: false, activeComparison: null });
        }
      },

      // ✅ FASE 31: Acciones de Selección de Análisis
      toggleAnalysisSelection: (analysisId) => {
        set((state) => {
          const newSet = new Set(state.selectedAnalysisIds);
          if (newSet.has(analysisId)) {
            newSet.delete(analysisId);
          } else {
            newSet.add(analysisId);
          }
          return { selectedAnalysisIds: newSet };
        });
      },

      selectAllAnalyses: () => {
        const { policyAnalyses } = get();
        set({ selectedAnalysisIds: new Set(policyAnalyses.map(a => a.id)) });
      },

      clearAnalysisSelection: () => {
        set({ selectedAnalysisIds: new Set() });
      },

      isAnalysisSelected: (analysisId) => {
        return get().selectedAnalysisIds.has(analysisId);
      },

      // ✅ FASE 31: Propuesta Generation
      generateProposal: async (caseId, comparisonId, version = 'client') => {
        const { selectedAnalysisIds, policyAnalyses } = get();

        // Use selected analyses, or all if none selected
        const analysisIdsToUse = selectedAnalysisIds.size > 0
          ? Array.from(selectedAnalysisIds)
          : policyAnalyses.map(a => a.id);

        set({ proposalLoading: true });

        try {
          const response = await fetch("/api/proposals/generate", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              caseId,
              comparisonId,
              version,
              selectedAnalysisIds: analysisIdsToUse,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to generate proposal");
          }

          const data = await response.json();

          if (data.success && data.proposal) {
            set({
              activeProposal: data.proposal,
              proposalLoading: false,
            });
            toast.success("Propuesta generada exitosamente");
          } else {
            throw new Error("Invalid response format");
          }
        } catch (error: any) {
          set({ proposalLoading: false });
          console.error("Error generating proposal:", error);
          toast.error(`Error al generar propuesta: ${error.message}`);
        }
      },

      loadActiveProposal: async (proposalId) => {
        set({ proposalLoading: true });

        try {
          const response = await fetch(`/ api / proposals / ${proposalId}`);

          if (!response.ok) {
            throw new Error("Failed to load proposal");
          }

          const data = await response.json();

          if (data.success && data.proposal) {
            set({
              activeProposal: data.proposal,
              proposalLoading: false,
            });
          } else {
            throw new Error("Invalid response format");
          }
        } catch (error: any) {
          set({ proposalLoading: false });
          console.error("Error loading proposal:", error);
          toast.error("Error al cargar la propuesta guardada");
        }
      },

      loadProposalByCase: async (caseId) => {
        // Avoid loading if already have a proposal for this case
        const currentProposal = get().activeProposal;
        if (currentProposal?.caseId === caseId) {
          return;
        }

        set({ proposalLoading: true });

        try {
          const response = await fetch(`/api/proposals/by-case/${caseId}`);

          if (!response.ok) {
            // ✅ Casos nuevos o sin propuesta: silenciar error y establecer null
            if (response.status === 404 || response.status === 403) {
              set({ activeProposal: null, proposalLoading: false });
              return;
            }
            throw new Error("Failed to load proposal");
          }

          const data = await response.json();

          if (data.success) {
            // proposal can be null if none exists yet
            set({
              activeProposal: data.proposal,
              proposalLoading: false,
            });
          } else {
            throw new Error("Invalid response format");
          }
        } catch (error: any) {
          set({ proposalLoading: false });
          console.error("Error loading proposal by case:", error);
          // Don't show error toast - it's okay if no proposal exists yet
        }
      },

      // ✅ NUEVO: Establecer organización activa
      setCurrentOrgId: (orgId: string) => {
        set({ currentOrgId: orgId });
      },

      // ✅ NUEVO: Resetear todo el estado del workspace al cambiar de organización
      // Esto garantiza que no se mezclen datos de diferentes organizaciones
      resetWorkspaceState: () => {
        console.log('🧹 [resetWorkspaceState] Limpiando estado del workspace...');
        set({
          // Resetear casos
          cases: [],
          casesLoaded: false,
          casesLoading: false,
          currentCaseId: null,
          
          // Resetear mensajes y chat
          messages: [],
          briefingCase: null,
          
          // Resetear políticas
          policies: [],
          policiesLoaded: false,
          policiesLoading: false,
          
          // Resetear análisis de pólizas
          policyAnalyses: [],
          policyAnalysesLoaded: false,
          policyAnalysesLoading: false,
          selectedPolicyAnalysisId: null,
          
          // Resetear comparaciones
          activeComparison: null,
          comparisonLoading: false,
          selectedAnalysisIds: new Set<string>(),
          
          // Resetear propuestas
          activeProposal: null,
          proposalLoading: false,
          
          // Resetear renovaciones
          renewals: [],
          renewalsLoaded: false,
          renewalsLoading: false,
          
          // Resetear compliance
          activeComplianceRecord: null,
          complianceLoading: false,
          
          // Resetear brief
          brief: {},
          
          // Resetear fase de aprobación
          approvalPhase: 'pending',
          caseApproved: false,
          caseApproving: false,
          caseApprovalError: null,
          
          // Limpiar datos pendientes del landing
          landingDataPending: null,
        });
        
        // Limpiar localStorage para evitar contaminación
        if (typeof window !== 'undefined') {
          try {
            localStorage.removeItem('briki-ui-state');
            console.log('✅ [resetWorkspaceState] Estado limpiado completamente');
          } catch (error) {
            console.error('❌ [resetWorkspaceState] Error limpiando localStorage:', error);
          }
        }
      },

      exportComparison: async (format) => {
        // TODO: FASE 30.4 - Implementar endpoint real
        console.log('Exporting comparison:', format);
        return new Blob(['Mock PDF Content'], { type: 'application/pdf' });
      },

      alignCoveragesSemantically: async (caseId, analysisIds) => {
        set({ comparisonLoading: true });

        try {
          const response = await fetch("/api/comparisons/align", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              caseId,
              analysisIds,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to align policies");
          }

          const data = await response.json();

          if (data.success && data.comparison) {
            set({
              activeComparison: data.comparison,
              comparisonLoading: false
            });
            toast.success("Comparación generada exitosamente");
            return data.comparison.rows;
          } else {
            throw new Error("Invalid response format");
          }
        } catch (error: any) {
          set({ comparisonLoading: false });
          console.error("Error aligning policies:", error);
          toast.error(`Error al generar comparación: ${error.message}`);
          throw error;
        }
      },

      detectCoverageGaps: (comparison) => {
        // TODO: FASE 30.2 - Implementar lógica real
        return [];
      },

      fetchRenewals: async (caseId?: string) => {
        const { renewalsLoading, currentCaseId } = get();
        const targetCaseId = caseId || currentCaseId;
        
        if (renewalsLoading) {
          return;
        }
        
        if (!targetCaseId) {
          console.log('⏭️ [fetchRenewals] No caseId available, skipping...');
          return;
        }
        
        set(() => ({ renewalsLoading: true }));
        try {
          console.log('📋 [fetchRenewals] Loading renewals for case:', targetCaseId);
          const renewals = await loadRenewals(targetCaseId);
          const withStatus = renewals.map((renewal: any) => ({
            ...renewal,
            status: renewal.status ?? deriveRenewalStatus(renewal.renewalDateISO),
          }));
          get().setRenewals(withStatus);
          console.log('✅ [fetchRenewals] Loaded', renewals.length, 'renewals');
        } catch (error) {
          console.error('❌ [fetchRenewals] Error:', error);
          set(() => ({ renewalsLoading: false }));
          throw error;
        }
      },
      
      // ✅ FASE 3 RENOVACIONES: Crear renovación
      createRenewal: async (data) => {
        try {
          console.log('📝 [createRenewal] Creating renewal:', data.planName);
          const result = await createRenewal(data);
          
          // Transform to RenewalRecord format and add to state
          const newRenewal: RenewalRecord = {
            id: result.renewal.id,
            carrier: result.renewal.carrier,
            plan: result.renewal.planName,
            renewalDateISO: result.renewal.renewalDate,
            premium: {
              amountMinor: result.renewal.currentPremiumMinor,
              currency: result.renewal.currency || 'COP',
            },
            status: result.renewal.renewalWindowStatus,
            reminderSet: result.renewal.reminderSet || false,
            policyId: result.renewal.policyAnalysisId || undefined,
          };
          
          set((state) => {
            const nextRenewals = [...state.renewals, newRenewal];
            const renewalsView = nextRenewals.map(renewalToView);
            const nextState = { ...state, renewals: nextRenewals };
            const filtered = computeFilteredSortedRenewals(nextState);
            const filteredView = filtered.map(renewalToView);
            return {
              renewals: nextRenewals,
              _cachedRenewalsView: renewalsView,
              _cachedFilteredRenewalsView: filteredView,
            };
          });
          
          toast.success(`Renovación "${data.planName}" creada exitosamente`);
          console.log('✅ [createRenewal] Created:', result.renewal.id);
          return newRenewal;
        } catch (error: any) {
          console.error('❌ [createRenewal] Error:', error);
          toast.error(`Error al crear renovación: ${error.message}`);
          throw error;
        }
      },
      
      // ✅ FASE 3 RENOVACIONES: Actualizar renovación
      updateRenewal: async (id, data) => {
        try {
          console.log('📝 [updateRenewal] Updating renewal:', id);
          const result = await updateRenewal(id, data);
          
          set((state) => {
            const nextRenewals = state.renewals.map((r) => {
              if (r.id !== id) return r;
              return {
                ...r,
                carrier: data.carrier ?? r.carrier,
                plan: data.planName ?? r.plan,
                renewalDateISO: data.renewalDate ?? r.renewalDateISO,
                reminderSet: data.reminderSet ?? r.reminderSet,
                status: result.renewal?.renewalWindowStatus ?? r.status,
              };
            });
            const renewalsView = nextRenewals.map(renewalToView);
            const nextState = { ...state, renewals: nextRenewals };
            const filtered = computeFilteredSortedRenewals(nextState);
            const filteredView = filtered.map(renewalToView);
            return {
              renewals: nextRenewals,
              _cachedRenewalsView: renewalsView,
              _cachedFilteredRenewalsView: filteredView,
            };
          });
          
          toast.success('Renovación actualizada');
          console.log('✅ [updateRenewal] Updated:', id);
        } catch (error: any) {
          console.error('❌ [updateRenewal] Error:', error);
          toast.error(`Error al actualizar: ${error.message}`);
          throw error;
        }
      },
      
      // ✅ FASE 3 RENOVACIONES: Eliminar renovación
      deleteRenewal: async (id) => {
        try {
          console.log('🗑️ [deleteRenewal] Deleting renewal:', id);
          await deleteRenewal(id);
          
          set((state) => {
            const nextRenewals = state.renewals.filter((r) => r.id !== id);
            const renewalsView = nextRenewals.map(renewalToView);
            const nextState = { ...state, renewals: nextRenewals };
            const filtered = computeFilteredSortedRenewals(nextState);
            const filteredView = filtered.map(renewalToView);
            return {
              renewals: nextRenewals,
              _cachedRenewalsView: renewalsView,
              _cachedFilteredRenewalsView: filteredView,
            };
          });
          
          toast.success('Renovación eliminada');
          console.log('✅ [deleteRenewal] Deleted:', id);
        } catch (error: any) {
          console.error('❌ [deleteRenewal] Error:', error);
          toast.error(`Error al eliminar: ${error.message}`);
          throw error;
        }
      },
      
      // ✅ FASE 3 RENOVACIONES: Auto-detectar renovaciones
      detectRenewals: async (caseId, daysAhead = 90) => {
        try {
          console.log('🔍 [detectRenewals] Detecting renewals for case:', caseId);
          const result = await detectRenewals(caseId, daysAhead);
          
          // Reload renewals to get the newly created ones
          await get().fetchRenewals(caseId);
          
          const created = result.created?.length || 0;
          const skipped = result.skipped?.length || 0;
          
          if (created > 0) {
            toast.success(`${created} renovación(es) detectada(s) automáticamente`);
          } else {
            toast.info('No se detectaron nuevas renovaciones pendientes');
          }
          
          console.log('✅ [detectRenewals] Result:', { created, skipped });
          return { created, skipped };
        } catch (error: any) {
          console.error('❌ [detectRenewals] Error:', error);
          toast.error(`Error al detectar renovaciones: ${error.message}`);
          throw error;
        }
      },
      
      // ✅ FASE 3 RENOVACIONES: Obtener estadísticas
      getRenewalStats: async (caseId) => {
        try {
          return await getRenewalStats(caseId);
        } catch (error: any) {
          console.error('❌ [getRenewalStats] Error:', error);
          throw error;
        }
      },
      
      // ✅ FASE 6 RENOVACIONES: Iniciar comparación desde renovación
      startRenewalComparison: (renewalId, policyAnalysisId) => {
        console.log('🔄 [startRenewalComparison] Starting comparison for renewal:', renewalId);
        
        // Si tenemos policyAnalysisId, pre-seleccionarlo para la comparación
        if (policyAnalysisId) {
          const newSet = new Set<string>([policyAnalysisId]);
          set({ selectedAnalysisIds: newSet });
          console.log('✅ [startRenewalComparison] Pre-selected analysis:', policyAnalysisId);
        } else {
          // Si no hay policyAnalysisId, limpiar selección y dejar que el usuario seleccione
          set({ selectedAnalysisIds: new Set<string>() });
          console.log('ℹ️ [startRenewalComparison] No policy analysis linked, clearing selection');
        }
        
        // Navegar al tab de comparaciones
        get().setActiveTab('comparisons');
        toast.info('Selecciona las pólizas a comparar y genera la comparativa con IA');
      },
      
      // ✅ FASE 7 RENOVACIONES: Generar propuesta desde renovación
      generateRenewalProposal: async (renewalId, policyAnalysisId) => {
        const { currentCaseId, activeComparison } = get();
        
        if (!currentCaseId) {
          toast.error('No hay caso activo para generar propuesta');
          return;
        }
        
        console.log('📄 [generateRenewalProposal] Generating proposal for renewal:', renewalId);
        
        // Si tenemos policyAnalysisId, pre-seleccionarlo
        if (policyAnalysisId) {
          const newSet = new Set<string>([policyAnalysisId]);
          set({ selectedAnalysisIds: newSet });
          console.log('✅ [generateRenewalProposal] Pre-selected analysis:', policyAnalysisId);
        }
        
        try {
          // Generar propuesta usando la comparación activa si existe
          await get().generateProposal(
            currentCaseId, 
            activeComparison?.id, 
            'client'
          );
          
          // Navegar al tab de propuesta
          get().setActiveTab('proposal');
          console.log('✅ [generateRenewalProposal] Proposal generated, navigated to proposal tab');
        } catch (error: any) {
          console.error('❌ [generateRenewalProposal] Error:', error);
          // El error ya se muestra en generateProposal
        }
      },
      
      setRenewalsFilters: (filters) =>
        set((state) => {
          const nextFilters = sanitizeRenewalsFilters({ ...state.renewalsFilters, ...filters });
          if (shallowEqualRenewalsFilters(state.renewalsFilters, nextFilters)) {
            return {};
          }
          const nextState = { ...state, renewalsFilters: nextFilters };
          const filtered = computeFilteredSortedRenewals(nextState);
          const filteredView = filtered.map(renewalToView);
          return {
            renewalsFilters: nextFilters,
            _cachedFilteredRenewalsView: filteredView, // Update filtered cache when filters change
            ...logRenewalsEventInternal(state, "FilterChange", { filters: nextFilters }),
          };
        }),
      setRenewalsSorting: (sorting) =>
        set((state) => {
          const nextSorting = sanitizeRenewalsSorting({ ...state.renewalsSorting, ...sorting });
          if (shallowEqualRenewalsSorting(state.renewalsSorting, nextSorting)) {
            return {};
          }
          const nextState = { ...state, renewalsSorting: nextSorting };
          const filtered = computeFilteredSortedRenewals(nextState);
          const filteredView = filtered.map(renewalToView);
          return {
            renewalsSorting: nextSorting,
            _cachedFilteredRenewalsView: filteredView, // Update filtered cache when sorting changes
            ...logRenewalsEventInternal(state, "SortChange", { sorting: nextSorting }),
          };
        }),
      setReminder: (id, reminderSet) =>
        set((state) => {
          const nextRenewals = state.renewals.map((renewal) =>
            renewal.id === id ? { ...renewal, reminderSet: Boolean(reminderSet) } : renewal
          );
          if (shallowEqualRenewals(state.renewals, nextRenewals)) {
            return {};
          }
          const renewalsView = nextRenewals.map(renewalToView);
          const nextState = { ...state, renewals: nextRenewals };
          const filtered = computeFilteredSortedRenewals(nextState);
          const filteredView = filtered.map(renewalToView);
          return {
            renewals: nextRenewals,
            _cachedRenewalsView: renewalsView, // Update cache when renewals change
            _cachedFilteredRenewalsView: filteredView, // Update filtered cache
            ...logRenewalsEventInternal(state, "ReminderSet", { id, reminderSet: Boolean(reminderSet) }),
          };
        }),
      logRenewalsEvent: (type, payload) =>
        set((state) => {
          if (type === "RenewalsViewOpen") {
            if (state.renewalsViewLogged) {
              return {};
            }
            return {
              renewalsViewLogged: true,
              ...logRenewalsEventInternal(state, type, payload),
            } satisfies Partial<UIState>;
          }
          return logRenewalsEventInternal(state, type, payload);
        }),
      selectFilteredSortedRenewals: () => computeFilteredSortedRenewals(get()),
      selectWindowCounts: () => computeRenewalWindowCounts(get()),
      isReminderSet: (id) => get().renewals.some((renewal) => renewal.id === id && renewal.reminderSet),
      getRenewalStatusChip: (status) => renewalStatusMetaMap[status] ?? renewalStatusMetaMap.ok,
      selectPoliciesView: () => {
        const state = get();
        // Return cached value if available to maintain referential stability
        if (state._cachedPoliciesView !== undefined) {
          return state._cachedPoliciesView;
        }
        // Compute the view (don't call set here - it would update during render!)
        const view = state.policies.map(policyToView);
        return view;
      },
      selectPolicyView: (policyId) => {
        const policy = get().policies.find((p) => p.id === policyId);
        return policy ? policyToView(policy) : undefined;
      },
      selectRenewalsView: () => {
        const state = get();
        // Return cached value if available to maintain referential stability
        if (state._cachedRenewalsView !== undefined) {
          return state._cachedRenewalsView;
        }
        // Compute the view (don't call set here - it would update during render!)
        const view = state.renewals.map(renewalToView);
        return view;
      },
      selectFilteredSortedRenewalsView: () => {
        const state = get();
        // Return cached value if available to maintain referential stability
        if (state._cachedFilteredRenewalsView !== undefined) {
          return state._cachedFilteredRenewalsView;
        }
        // Compute the view (don't call set here - it would update during render!)
        const filtered = computeFilteredSortedRenewals(state);
        const view = filtered.map(renewalToView);
        return view;
      },
      // ✅ FASE 4: Policy Analysis Actions Implementation
      fetchPolicyAnalyses: async (caseId: string) => {
        const { policyAnalysesLoading } = get();
        if (policyAnalysesLoading) {
          console.log('⏭️ [fetchPolicyAnalyses] Already loading, skipping...');
          return;
        }

        console.log('📋 [fetchPolicyAnalyses] Fetching analyses for case:', caseId);
        set({ policyAnalysesLoading: true });

        try {
          const response = await fetch(`/api/policies/analyses?caseId=${caseId}`);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          console.log('✅ [fetchPolicyAnalyses] Loaded:', data.count, 'analyses');

          set({
            policyAnalyses: data.analyses || [],
            policyAnalysesLoaded: true,
            policyAnalysesLoading: false,
            _cachedPolicyAnalysesView: undefined // Clear cache
          });
        } catch (error: any) {
          console.error('❌ [fetchPolicyAnalyses] Error:', error.message);
          set({
            policyAnalysesLoading: false,
            policyAnalyses: [],
            policyAnalysesLoaded: true
          });
          throw error;
        }
      },

      setPolicyAnalyses: (analyses: PolicyAnalysis[]) => {
        console.log('📋 [setPolicyAnalyses] Setting', analyses.length, 'analyses');
        set({
          policyAnalyses: analyses,
          policyAnalysesLoaded: true,
          _cachedPolicyAnalysesView: undefined // Clear cache
        });
      },

      setSelectedPolicyAnalysis: (analysisId: string | null) => {
        console.log('🎯 [setSelectedPolicyAnalysis]', analysisId);
        set({ selectedPolicyAnalysisId: analysisId });
      },

      setSelectedField: (field: string | null) => {
        console.log('🔍 [setSelectedField]', field);
        set({ selectedField: field });
      },

      setActiveTab: (tab: WorkspaceTab) => {
        console.log('📑 [setActiveTab]', tab);
        set({ activeTab: tab });
      },

      navigateToAnalysis: (analysisId: string) => {
        console.log('🚀 [navigateToAnalysis]', analysisId);
        set({
          selectedPolicyAnalysisId: analysisId,
          activeTab: 'analysis'
        });
      },

      analyzePolicyArtifact: async (artifactId: string) => {
        console.log('🤖 [analyzePolicyArtifact] Analyzing artifact:', artifactId);

        // ✅ FASE 22: Prevención de Análisis Duplicado
        const pending = get()._pendingPolicyAnalysis || new Set();
        if (pending.has(artifactId)) {
          console.log('⏭️ [analyzePolicyArtifact] Ya en progreso, skipping:', artifactId);
          // Retornar una promesa que nunca se resuelve o lanzar error controlado?
          // Mejor lanzar error para que el caller sepa que no se inició
          throw new Error('Analysis already in progress');
        }

        // Marcar como en progreso
        const newPending = new Set(pending);
        newPending.add(artifactId);
        set({ _pendingPolicyAnalysis: newPending });

        try {
          const response = await fetch('/api/policies/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              artifactId,
              extractionMethod: 'hybrid'
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();

          if (!data.success) {
            throw new Error(data.error || 'Analysis failed');
          }

          console.log('✅ [analyzePolicyArtifact] Analysis completed:', data.analysis.id);

          // Add to the list
          const { policyAnalyses } = get();
          set({
            policyAnalyses: [...policyAnalyses, data.analysis],
            _cachedPolicyAnalysesView: undefined // Clear cache
          });

          return data.analysis;
        } catch (error: any) {
          console.error('❌ [analyzePolicyArtifact] Error:', error.message);
          throw error;
        } finally {
          // ✅ FASE 22: Limpiar flag
          const currentPending = get()._pendingPolicyAnalysis || new Set();
          const updatedPending = new Set(currentPending);
          updatedPending.delete(artifactId);
          set({ _pendingPolicyAnalysis: updatedPending });
        }
      },


      selectPolicyAnalysesView: () => {
        const state = get();
        // Return cached value if available to maintain referential stability
        if (state._cachedPolicyAnalysesView !== undefined) {
          return state._cachedPolicyAnalysesView;
        }
        // Compute the view (don't call set here - it would update during render!)
        const view = state.policyAnalyses.map(analysisToView);
        return view;
      },
    }),
    { name: "ui-store" }
  )
);

// ✅ FASE 5: Cargar estado persistido al inicializar
if (typeof window !== 'undefined') {
  const persistedState = loadPersistedState();
  if (Object.keys(persistedState).length > 0) {
    useUI.setState(persistedState);
    console.log('✅ [useUI] Estado persistido cargado al inicializar');
  }
}

function sanitizeWeightValue(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function createEmptyBreakdown(): Record<ComparisonMetric, number> {
  return comparisonMetrics.reduce((acc, metric) => {
    acc[metric] = 0;
    return acc;
  }, {} as Record<ComparisonMetric, number>);
}

function safeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return value;
}

function computeRange(values: number[]) {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) {
    return { min: 0, max: 0 };
  }
  return {
    min: Math.min(...finite),
    max: Math.max(...finite),
  };
}

function normalizeLowerIsBetter(value: number, range: { min: number; max: number }) {
  if (range.max === range.min) return 1;
  const normalized = (range.max - value) / (range.max - range.min);
  if (!Number.isFinite(normalized)) return 0;
  if (normalized < 0) return 0;
  if (normalized > 1) return 1;
  return normalized;
}

function normalizeHigherIsBetter(value: number, range: { min: number; max: number }) {
  if (range.max === range.min) return 1;
  const normalized = (value - range.min) / (range.max - range.min);
  if (!Number.isFinite(normalized)) return 0;
  if (normalized < 0) return 0;
  if (normalized > 1) return 1;
  return normalized;
}

function computeComparisonScores(policies: Policy[], weights: ComparisonWeights): PolicyComparisonScore[] {
  if (!policies.length) return [];

  const sanitized = sanitizeWeights(weights);
  const totalWeight = comparisonMetrics.reduce((sum, metric) => sum + sanitized[metric], 0);
  const normalizedWeights = totalWeight > 0
    ? comparisonMetrics.reduce((acc, metric) => {
      acc[metric] = sanitized[metric] / totalWeight;
      return acc;
    }, {} as Record<ComparisonMetric, number>)
    : fallbackEqualWeights();

  const premiumValues = policies.map((policy) => safeNumber(policy.premium.amountMinor / 100));
  const deductibleValues = policies.map((policy) => safeNumber(policy.deductible.amountMinor / 100));
  const riderCounts = policies.map((policy) => safeNumber(policy.riders?.length ?? 0));
  const networkScores = policies.map((policy) => mapNetwork(policy.network));
  const serviceScores = policies.map((policy) => mapService(policy.service));

  const premiumRange = computeRange(premiumValues);
  const deductibleRange = computeRange(deductibleValues);
  const ridersRange = computeRange(riderCounts);

  return policies.map((policy, index) => {
    const breakdown: Record<ComparisonMetric, number> = {
      premium: normalizeLowerIsBetter(premiumValues[index] ?? 0, premiumRange),
      deductible: normalizeLowerIsBetter(deductibleValues[index] ?? 0, deductibleRange),
      riders: normalizeHigherIsBetter(riderCounts[index] ?? 0, ridersRange),
      network: networkScores[index] ?? 0.5,
      service: serviceScores[index] ?? 0.55,
    };

    const total = comparisonMetrics.reduce((sum, metric) => sum + breakdown[metric] * normalizedWeights[metric], 0) * 100;

    return {
      plan: policy.plan,
      total: Number.isFinite(total) ? Math.round(total * 10) / 10 : 0,
      breakdown,
    };
  });
}

function fallbackEqualWeights(): Record<ComparisonMetric, number> {
  const equalWeight = 1 / comparisonMetrics.length;
  return comparisonMetrics.reduce((acc, metric) => {
    acc[metric] = equalWeight;
    return acc;
  }, {} as Record<ComparisonMetric, number>);
}

function mapNetwork(level?: NetworkLevel): number {
  switch (level) {
    case "preferred":
      return 0.75;
    case "concierge":
      return 0.95;
    case "basic":
    default:
      return 0.5;
  }
}

function mapService(level?: ServiceLevel): number {
  switch (level) {
    case "enhanced":
      return 0.7;
    case "white-glove":
      return 0.95;
    case "standard":
    default:
      return 0.55;
  }
}

function computeNextComparisonState(
  state: UIState,
  weights: Partial<ComparisonWeights> | ComparisonWeights,
  playbook = state.comparisonPlaybook,
  override = false
) {
  const merged: ComparisonWeights = override
    ? sanitizeWeights(weights as ComparisonWeights)
    : sanitizeWeights({
      ...state.comparisonWeights,
      ...weights,
    } as ComparisonWeights);

  return {
    comparisonPlaybook: playbook,
    comparisonWeights: merged,
    comparisonScores: computeComparisonScores(state.policies, merged),
  } satisfies Partial<UIState>;
}

function sanitizeWeights(weights: ComparisonWeights): ComparisonWeights {
  return comparisonMetrics.reduce((acc, metric) => {
    acc[metric] = sanitizeWeightValue(weights[metric] ?? 0);
    return acc;
  }, {} as ComparisonWeights);
}

function createDefaultComplianceChecked(): ComplianceCheckedState {
  return Object.entries(complianceChecklistItems).reduce((acc, [jurisdiction, items]) => {
    acc[jurisdiction as ComplianceJurisdiction] = items.reduce((itemAcc, item) => {
      itemAcc[item as ComplianceItemId] = false;
      return itemAcc;
    }, {} as Record<ComplianceItemId, boolean>);
    return acc;
  }, {} as ComplianceCheckedState);
}

function ensureComplianceCheckedForJurisdiction(
  checked: ComplianceCheckedState,
  jurisdiction: ComplianceJurisdiction
): ComplianceCheckedState {
  const items = complianceChecklistItems[jurisdiction];
  if (!items) {
    return checked;
  }

  const existing = checked[jurisdiction] ?? {};
  let mutated = false;
  const next = { ...existing } as Record<ComplianceItemId, boolean>;

  for (const item of items) {
    if (typeof next[item] !== "boolean") {
      next[item] = false;
      mutated = true;
    }
  }

  if (!mutated && existing === checked[jurisdiction]) {
    return checked;
  }

  return {
    ...checked,
    [jurisdiction]: next,
  };
}

// Renamed ComplianceAuditEvent to LocalComplianceEvent
type LocalComplianceEvent = {
  type: "ComplianceOpen" | "ChecklistToggle" | "CompliancePass" | "SendAttempt" | "SendBlocked" | "SendSuccess";
  ts: number;
  payload?: any;
};


function appendComplianceEvent(log: LocalComplianceEvent[] | undefined, event: LocalComplianceEvent): LocalComplianceEvent[] {
  // Guard: Ensure log is an array
  const safeLog = Array.isArray(log) ? log : [];

  // Keep only last 50 events
  const newLog = [...safeLog, event];
  if (newLog.length > 50) {
    return newLog.slice(newLog.length - 50);
  }
  return newLog;
}

function shallowEqualComplianceState(
  current: Record<ComplianceItemId, boolean> | undefined,
  next: Record<ComplianceItemId, boolean>
): boolean {
  if (!current) return false;
  const currentKeys = Object.keys(current);
  const nextKeys = Object.keys(next);
  if (currentKeys.length !== nextKeys.length) {
    return false;
  }
  for (const key of nextKeys) {
    if (current[key as ComplianceItemId] !== next[key as ComplianceItemId]) {
      return false;
    }
  }
  return true;
}


