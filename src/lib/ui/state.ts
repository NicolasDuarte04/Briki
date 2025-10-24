import { getTranslations } from "next-intl/server";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

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
} from "../types";
import {
  loadCases,
  loadEligibilities,
  loadPolicies,
  loadPricingBands,
  loadProducts,
  loadProvenance,
  loadRenewals,
  loadRiders,
} from "../fx";
import { sendViaEmail, sendViaWhatsApp } from "../share";
import { BriefingCase, SourcingUpdate } from "@/lib/types";

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

export type {
  BrokerProfile,
  Case,
  CaseBrief,
  ComparisonMetric,
  ComparisonPlaybook,
  ComparisonWeights,
  Eligibility,
  Policy,
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
  | "ReminderSet";

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

interface ComplianceAuditEvent {
  type: ComplianceEventType;
  ts: number;
  payload?: Record<string, unknown>;
}

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

export interface UIState {
  initialMessage?: string;
  currentCaseId: string | null;
  step: UIStep;
  isSourcing: boolean;
  rightOpen: boolean;
  complianceOpen: boolean;
  chatPanelOpen: boolean;
  // Nuevo estado para el flujo de briefing
  briefingCase: { isActive: boolean; initialMessage: string } | null;
  complianceJurisdiction: ComplianceJurisdiction;
  checked: ComplianceCheckedState;
  complianceAuditLog: ComplianceAuditEvent[];
  followupCadenceDays: number[];
  followupAuditLog: FollowupAuditEvent[];
  brief: CaseBrief;
  policies: Policy[];
  policiesLoading: boolean;
  policiesLoaded: boolean;
  comparisonWeights: ComparisonWeights;
  comparisonScores: PolicyComparisonScore[];
  comparisonPlaybook: ComparisonPlaybook;
  proposalBrokerProfile: BrokerProfile;
  proposalSelectedPlans: ProposalSelectedPlan[];
  proposalDisclosuresKeys: string[];
  proposalMathCheck: ProposalMathCheck;
  proposalShareUrl: string;
  proposalLoading: boolean;
  proposalGeneratedOn: string | null;
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
  // Cache properties (internal use)
  _cachedPoliciesView?: PolicyView[];
  _cachedRenewalsView?: RenewalView[];
  _cachedFilteredRenewalsView?: RenewalView[];
  setInitialMessage: (message: string) => void;
  clearInitialMessage: () => void;
  setCurrentCaseId: (id: string | null) => void;
  setStep: (step: UIStep) => void;
  // Función para aprobación de casos
  approveCurrentCase: () => Promise<boolean>;
  resetApprovalStatus: () => void;
  // Funciones para el flujo de briefing
  startBriefing: (initialMessage: string) => void;
  completeBriefing: (caseId: string) => void;
  cancelBriefing: () => void;
  toggleRight: () => void;
  openChatPanel: () => void;
  closeChatPanel: () => void;
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
  fetchCases: () => Promise<void>;
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
  fetchRenewals: () => Promise<void>;
  setReminder: (id: string, reminderSet: boolean) => void;
  logRenewalsEvent: (type: RenewalsEventType, payload?: Record<string, unknown>) => void;
  selectFilteredSortedRenewals: () => RenewalRecord[];
  selectWindowCounts: () => Record<RenewalWindowDays, number>;
  isReminderSet: (id: string) => boolean;
  // Returns tone and status only; components must translate labels client-side.
  getRenewalStatusChip: (status: RenewalStatus) => RenewalStatusMeta;
  selectPoliciesView: () => PolicyView[];
  selectPolicyView: (policyId: string) => PolicyView | undefined;
  selectRenewalsView: () => RenewalView[];
  selectFilteredSortedRenewalsView: () => RenewalView[];
  dashboardViewTime: number | null;
  setDashboardViewTime: (time: number) => void;
}

export const useUI = create<UIState>()(
  devtools(
    (set, get) => ({
      initialMessage: undefined,
      currentCaseId: null,
      step: "landing",
      isSourcing: false,
      rightOpen: true,
      complianceOpen: false,
      chatPanelOpen: false,
      briefingCase: null,
      complianceJurisdiction: complianceJurisdictions[0] ?? "co",
      checked: createDefaultComplianceChecked(),
      complianceAuditLog: [],
      followupCadenceDays: [...DEFAULT_FOLLOWUP_CADENCE_DAYS],
      followupAuditLog: [],
      brief: {
        businessType: "Por definir...",
        employees: 0,
        coverage: "Por definir...",
        freeText: "Por definir...",
      },
      policies: [],
      policiesLoading: false,
      policiesLoaded: false,
      comparisonWeights: { ...defaultComparisonWeights },
      comparisonScores: [],
      comparisonPlaybook: "sme",
      proposalBrokerProfile: defaultBrokerProfile,
      proposalSelectedPlans: defaultProposalSelectedPlans,
      proposalDisclosuresKeys: [...defaultProposalDisclosuresKeys],
      proposalMathCheck: defaultProposalMathCheck,
      proposalShareUrl: DEFAULT_PROPOSAL_SHARE_URL,
      proposalLoading: false,
      proposalGeneratedOn: null,
      products: [],
      productsLoading: false,
      productsLoaded: false,
      riders: [],
      ridersLoading: false,
      ridersLoaded: false,
      pricingBands: [],
      pricingBandsLoading: false,
      pricingBandsLoaded: false,
      eligibilities: [],
      eligibilitiesLoading: false,
      eligibilitiesLoaded: false,
      provenance: [],
      provenanceLoading: false,
      provenanceLoaded: false,
      cases: [],
      casesLoading: false,
      casesLoaded: false,
      renewals: [],
      renewalsLoading: false,
      renewalsLoaded: false,
      renewalsFilters: defaultRenewalsFilters,
      renewalsSorting: defaultRenewalsSorting,
      renewalsAuditLog: [],
      renewalsSequence: 0,
      renewalsViewLogged: false,
      // Estados para aprobación de casos
      caseApproving: false,
      caseApprovalError: null,
      caseApproved: false,
      dashboardViewTime: null,
      setInitialMessage: (message: string) => set({ initialMessage: message }),  // ✅ Implementación
      clearInitialMessage: () => set({ initialMessage: "" }),                  // ✅ Implementación simple
      setCurrentCaseId: (id: string | null) => set({ currentCaseId: id }),     // ✅ AÑADIDO
      setStep: (step) =>
        set((state) => {
          if (state.isSourcing && step !== "conversation") {
            return {};
          }
          return { step };
        }),
      // Función para aprobación de casos
      approveCurrentCase: async () => {
        const { brief, currentCaseId, startSourcing } = get();

        console.log('🔍 DEBUG approveCurrentCase:', { 
          currentCaseId, 
          brief,
          briefKeys: Object.keys(brief || {}),
          briefValues: brief
        });

        if (!currentCaseId) {
          console.error('❌ No currentCaseId found');
          set({ caseApprovalError: 'No active case selected.' });
          return false;
        }

        set({ caseApproving: true, caseApprovalError: null });

        try {
          console.log('🚀 Calling /api/cases/approve with:', { caseId: currentCaseId, briefData: brief });
          
          const response = await fetch('/api/cases/approve', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              caseId: currentCaseId,
              briefData: brief // Envía la versión más reciente del brief desde el store
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
          set({ caseApproved: true, caseApproving: false });
          startSourcing();
          return true;

        } catch (error: any) {
          console.error('❌ approveCurrentCase error:', error);
          set({ caseApproving: false, caseApprovalError: error.message });
          return false;
        }
      },
      resetApprovalStatus: () => set({ caseApproved: false }),
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
      toggleRight: () => set((state) => ({ rightOpen: !state.rightOpen })),
      openChatPanel: () => set(() => ({ chatPanelOpen: true })),
      closeChatPanel: () => set(() => ({ chatPanelOpen: false })),
      openCompliance: (jurisdiction) =>
        set((state) => ({
          complianceOpen: true,
          complianceJurisdiction: jurisdiction,
          checked: ensureComplianceCheckedForJurisdiction(state.checked, jurisdiction),
          complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, {
            type: "ComplianceOpen",
            ts: Date.now(),
            payload: { jurisdiction },
          }),
        })),
      closeCompliance: () => set(() => ({ complianceOpen: false })),
      toggleCompliance: (itemId) =>
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
        }),
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
          const event: ComplianceAuditEvent = {
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
          const event: ComplianceAuditEvent = {
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
          const event: ComplianceAuditEvent = {
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
         
        console.log("Primary action on step:", get().step);
      },
      startSourcing: () => set(() => ({ isSourcing: true, step: "conversation" })),
      stopSourcing: () => set(() => ({ isSourcing: false })),
      setBrief: (brief) =>
        set((state) => ({ brief: { ...state.brief, ...brief } })),
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
      fetchCases: async () => {
        const { casesLoading, casesLoaded } = get();
        if (casesLoading || casesLoaded) {
          return;
        }
        set(() => ({ casesLoading: true } satisfies Partial<UIState>));
        try {
          // Usar API route para evitar problemas de server/client components
          const response = await fetch('/api/cases');
          const data = await response.json();
          set(() => ({ cases: data.cases, casesLoaded: true, casesLoading: false } satisfies Partial<UIState>));
        } catch (error) {
          console.error("Error loading cases:", error);
          set(() => ({ cases: [], casesLoaded: false, casesLoading: false } satisfies Partial<UIState>));
        }
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
      fetchRenewals: async () => {
        const { renewalsLoading, renewalsLoaded } = get();
        if (renewalsLoading || renewalsLoaded) {
          return;
        }
        set(() => ({ renewalsLoading: true }));
        try {
          const renewals = await loadRenewals();
          const withStatus = renewals.map((renewal: any) => ({
            ...renewal,
            status: renewal.status ?? deriveRenewalStatus(renewal.renewalDateISO),
          }));
          get().setRenewals(withStatus);
        } catch (error) {
          set(() => ({ renewalsLoading: false }));
          throw error;
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
      setDashboardViewTime: (time) => set({ dashboardViewTime: time }),
    }),
    { name: "ui-store" }
  )
);

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

function appendComplianceEvent(log: ComplianceAuditEvent[], event: ComplianceAuditEvent): ComplianceAuditEvent[] {
  if (log.length === 0) {
    return [event];
  }
  return [...log, event];
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


