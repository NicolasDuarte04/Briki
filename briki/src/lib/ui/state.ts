import { getTranslations } from "next-intl/server";
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { ZodError } from "zod";

import { complianceChecklistItems, complianceJurisdictions, type JurisdictionCode } from "../compliance";
import {
  type BrokerProfile,
  type CaseBrief,
  type ComparisonMetric,
  type ComparisonPlaybook,
  type ComparisonWeights,
  type Money,
  type NetworkLevel,
  type Policy,
  type PolicyComparisonScore,
  type ProposalMathCheck,
  type ProposalSelectedPlan,
  type RenewalRecord,
  type RenewalStatus,
  type RenewalStatusChipProps,
  type RenewalsFilters,
  type RenewalsSorting,
  type RenewalsSortBy,
  type RenewalsSortDir,
  type RenewalWindowDays,
  type ServiceLevel,
  type UIStep,
} from "../types";
import { PolicySchema, RenewalRecordSchema } from "../validation";
import { sendViaEmail, sendViaWhatsApp } from "../share";

export type {
  BrokerProfile,
  CaseBrief,
  ComparisonMetric,
  ComparisonPlaybook,
  ComparisonWeights,
  Policy,
  PolicyComparisonScore,
  ProposalMathCheck,
  ProposalSelectedPlan,
  RenewalRecord,
  RenewalStatus,
  RenewalStatusChipProps,
  RenewalsFilters,
  RenewalsSorting,
  RenewalWindowDays,
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

interface RenewalSeed extends Omit<RenewalRecord, "status"> {
  status?: RenewalStatus;
}

const RENEWALS_REFERENCE_DATE_ISO = "2025-03-01T00:00:00.000Z";
const RENEWALS_REFERENCE_DATE = new Date(RENEWALS_REFERENCE_DATE_ISO);
const RENEWAL_WINDOWS: RenewalWindowDays[] = [30, 60, 90];

const renewalSeeds: readonly RenewalSeed[] = [
  {
    id: "ren-001",
    carrier: "Andes Mutual",
    plan: "Andes Health Core",
    renewalDateISO: "2025-02-10T00:00:00.000Z",
    premium: createMoney(1825),
    reminderSet: false,
  },
  {
    id: "ren-002",
    carrier: "SierraCare",
    plan: "Sierra Plus",
    renewalDateISO: "2025-03-10T00:00:00.000Z",
    premium: createMoney(2140),
    reminderSet: true,
  },
  {
    id: "ren-003",
    carrier: "Pacifica",
    plan: "Pacifica Growth",
    renewalDateISO: "2025-04-05T00:00:00.000Z",
    premium: createMoney(1975),
    reminderSet: false,
  },
  {
    id: "ren-004",
    carrier: "Brisa Salud",
    plan: "Brisa Integral",
    renewalDateISO: "2025-03-25T00:00:00.000Z",
    premium: createMoney(2380),
    reminderSet: false,
  },
  {
    id: "ren-005",
    carrier: "Cordillera",
    plan: "Cordillera Shield",
    renewalDateISO: "2025-01-20T00:00:00.000Z",
    premium: createMoney(1680),
    reminderSet: true,
  },
  {
    id: "ren-006",
    carrier: "Altiplano",
    plan: "Altiplano Elite",
    renewalDateISO: "2025-04-20T00:00:00.000Z",
    premium: createMoney(2890),
    reminderSet: false,
  },
];

const seededRenewalsSource = renewalSeeds.map((seed) => ({
  ...seed,
  status: seed.status ?? deriveRenewalStatus(seed.renewalDateISO, RENEWALS_REFERENCE_DATE),
}));

const seededRenewals = parseRenewals(seededRenewalsSource, "seededRenewals");

const defaultRenewalsFilters: RenewalsFilters = {
  windowDays: 90,
  carriers: [],
  statuses: [],
};

const defaultRenewalsSorting: RenewalsSorting = {
  sortBy: "date",
  sortDir: "desc",
};

const renewalStatusChipMap: Record<RenewalStatus, RenewalStatusChipProps> = {
  ok: { label: "Activa", tone: "neutral" },
  dueSoon: { label: "Pronto", tone: "warning" },
  overdue: { label: "Vencida", tone: "critical" },
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

// Helper function to create Money objects (assuming USD)
function createMoney(amountMajor: number, currency: 'USD' | 'COP' | 'MXN' | 'EUR' = 'USD'): Money {
  return {
    amountMinor: Math.round(amountMajor * 100),
    currency,
  };
}

// Helper function to convert Money to major units for view
function moneyToMajor(money: Money): number {
  return money.amountMinor / 100;
}

// Local type for view representation of a policy (internal to this file only)
type PolicyView = {
  plan: string;
  premium: number;
  deductible: number;
  riders: string[];
  network?: NetworkLevel;
  service?: ServiceLevel;
};

// Helper to convert Policy to PolicyView
function policyToView(policy: Policy): PolicyView {
  return {
    plan: policy.plan,
    premium: moneyToMajor(policy.premium),
    deductible: moneyToMajor(policy.deductible),
    riders: policy.riders,
    network: policy.network,
    service: policy.service,
  };
}

// Helper to convert RenewalRecord to view format
type RenewalView = Omit<RenewalRecord, 'premium'> & { premium: number };

function logValidationWarning(context: string, error: ZodError): void {
  const detailKeys: string[] = [];
  if (error.issues.some((issue) => issue.code === "invalid_union")) {
    detailKeys.push("validation.invalidUnion");
  }
  // eslint-disable-next-line no-console
  console.warn(`[ui-state:${context}]`, {
    messageKey: "data.malformed",
    detailKeys,
    fallbackApplied: true,
    issues: error.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
    })),
  });
}

function parsePolicies(input: unknown, context: string): Policy[] {
  const result = PolicySchema.array().safeParse(input);
  if (result.success) {
    return result.data;
  }
  logValidationWarning(context, result.error);
  return [];
}

function parseRenewals(input: unknown, context: string): RenewalRecord[] {
  const result = RenewalRecordSchema.array().safeParse(input);
  if (result.success) {
    return result.data;
  }
  logValidationWarning(context, result.error);
  return [];
}

function renewalToView(renewal: RenewalRecord): RenewalView {
  return {
    ...renewal,
    premium: moneyToMajor(renewal.premium),
  };
}

const seededPoliciesSource = [
  {
    id: 'seed-starter',
    plan: "Starter",
    premium: createMoney(1200),
    deductible: createMoney(5000),
    riders: ["Cyber", "Dental"],
    network: "basic",
    service: "standard",
  },
  {
    id: 'seed-growth',
    plan: "Growth",
    premium: createMoney(1850),
    deductible: createMoney(3000),
    riders: ["Vision", "Wellness"],
    network: "preferred",
    service: "enhanced",
  },
  {
    id: 'seed-premium',
    plan: "Premium",
    premium: createMoney(2450),
    deductible: createMoney(1500),
    riders: ["Cyber", "Telemedicine", "Maternity"],
    network: "preferred",
    service: "white-glove",
  },
  {
    id: 'seed-enterprise',
    plan: "Enterprise",
    premium: createMoney(3200),
    deductible: createMoney(1000),
    riders: ["Executive Physical", "Global Travel"],
    network: "concierge",
    service: "white-glove",
  },
];

const seededPolicies = parsePolicies(seededPoliciesSource, "seededPolicies");

const defaultBrokerProfile: BrokerProfile = {
  name: "Camila Duarte",
  agency: "Andes Advisory Group",
  email: "camila@andesadvisory.com",
  phone: "+57 320 123 4567",
  brandColor: "#0F766E",
  logoUrl: undefined,
};

const defaultProposalSelectedPlans: ProposalSelectedPlan[] = seededPolicies.slice(0, 3).map((policy) => ({
  planId: policy.plan,
  rationaleKey: "selectedPlans.defaultRationale",
}));

const defaultProposalDisclosuresKeys = [
  "disclosures.items.0",
  "disclosures.items.1",
  "disclosures.items.2",
];

const defaultProposalMathCheck: ProposalMathCheck = {
  passed: true,
  messageKey: "mathCheck.messages.passed",
};

const DEFAULT_PROPOSAL_SHARE_URL = "https://briki.app/share/demo-proposal";
const DEFAULT_FOLLOWUP_CADENCE_DAYS = [2, 5] as const;
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

  return {
    name: asTrimmedString(updates?.name) ?? base.name ?? defaultBrokerProfile.name,
    agency: asTrimmedString(updates?.agency) ?? base.agency ?? defaultBrokerProfile.agency,
    email: asTrimmedString(updates?.email) ?? base.email,
    phone: asTrimmedString(updates?.phone) ?? base.phone,
    brandColor: sanitizeBrandColor(asTrimmedString(updates?.brandColor), base.brandColor ?? defaultBrokerProfile.brandColor),
    logoUrl: asTrimmedString(updates?.logoUrl) ?? base.logoUrl,
  };
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
    payload,
  };
  const renewalsAuditLog = [...state.renewalsAuditLog, event];
  return { renewalsAuditLog, renewalsSequence: sequence };
}

export interface UIState {
  step: UIStep;
  isSourcing: boolean;
  rightOpen: boolean;
  complianceOpen: boolean;
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
  renewals: RenewalRecord[];
  renewalsFilters: RenewalsFilters;
  renewalsSorting: RenewalsSorting;
  renewalsAuditLog: RenewalsAuditEvent[];
  renewalsSequence: number;
  renewalsViewLogged: boolean;
  setStep: (step: UIStep) => void;
  toggleRight: () => void;
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
  setReminder: (id: string, reminderSet: boolean) => void;
  logRenewalsEvent: (type: RenewalsEventType, payload?: Record<string, unknown>) => void;
  selectFilteredSortedRenewals: () => RenewalRecord[];
  selectWindowCounts: () => Record<RenewalWindowDays, number>;
  isReminderSet: (id: string) => boolean;
  getRenewalStatusChip: (status: RenewalStatus) => RenewalStatusChipProps;
  selectPoliciesView: () => PolicyView[];
  selectPolicyView: (policyId: string) => PolicyView | undefined;
  selectRenewalsView: () => RenewalView[];
  selectFilteredSortedRenewalsView: () => RenewalView[];
}

export const useUI = create<UIState>()(
  devtools(
    (set, get) => ({
      step: "landing",
      isSourcing: false,
      rightOpen: true,
      complianceOpen: false,
      complianceJurisdiction: complianceJurisdictions[0] ?? "co",
      checked: createDefaultComplianceChecked(),
      complianceAuditLog: [],
      followupCadenceDays: [...DEFAULT_FOLLOWUP_CADENCE_DAYS],
      followupAuditLog: [],
      brief: {
        businessType: "Tech startup in Bogotá",
        employees: 12,
        coverage: "Health, Cyber",
        freeText: "Early-stage team. Needs streamlined onboarding and basic compliance.",
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
      renewals: seededRenewals,
      renewalsFilters: defaultRenewalsFilters,
      renewalsSorting: defaultRenewalsSorting,
      renewalsAuditLog: [],
      renewalsSequence: 0,
      renewalsViewLogged: false,
      setStep: (step) =>
        set((state) => {
          if (state.isSourcing && step !== "conversation") {
            return {};
          }
          return { step };
        }),
      toggleRight: () => set((state) => ({ rightOpen: !state.rightOpen })),
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
        set((state) => ({
          complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, {
            type: "SendAttempt",
            ts: Date.now(),
            payload,
          }),
        })),
      logComplianceSendBlocked: (payload) =>
        set((state) => ({
          complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, {
            type: "SendBlocked",
            ts: Date.now(),
            payload,
          }),
        })),
      logComplianceSendSuccess: (payload) =>
        set((state) => ({
          complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, {
            type: "SendSuccess",
            ts: Date.now(),
            payload,
          }),
        })),
      primaryAction: () => {
        // For now just log the current step as requested
        // eslint-disable-next-line no-console
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
        set((state) => {
          const validated = parsePolicies(policies, "setPolicies");
          return {
            policies: validated,
            policiesLoaded: true,
            policiesLoading: false,
            comparisonScores: computeComparisonScores(validated, state.comparisonWeights),
          };
        }),
      fetchPolicies: async () => {
        const { policiesLoading, policiesLoaded } = get();
        if (policiesLoading || policiesLoaded) {
          return;
        }
        set(() => ({ policiesLoading: true }));
        try {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          get().setPolicies(seededPolicies);
        } catch (error) {
          set(() => ({ policiesLoading: false }));
          throw error;
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
      setRenewalsFilters: (filters) =>
        set((state) => {
          const nextFilters = sanitizeRenewalsFilters({ ...state.renewalsFilters, ...filters });
          if (shallowEqualRenewalsFilters(state.renewalsFilters, nextFilters)) {
            return {};
          }
          return {
            renewalsFilters: nextFilters,
            ...logRenewalsEventInternal(state, "FilterChange", { filters: nextFilters }),
          } satisfies Partial<UIState>;
        }),
      setRenewalsSorting: (sorting) =>
        set((state) => {
          const nextSorting = sanitizeRenewalsSorting({ ...state.renewalsSorting, ...sorting });
          if (shallowEqualRenewalsSorting(state.renewalsSorting, nextSorting)) {
            return {};
          }
          return {
            renewalsSorting: nextSorting,
            ...logRenewalsEventInternal(state, "SortChange", { sorting: nextSorting }),
          } satisfies Partial<UIState>;
        }),
      setReminder: (id, reminderSet) =>
        set((state) => {
          const nextRenewals = state.renewals.map((renewal) =>
            renewal.id === id ? { ...renewal, reminderSet: Boolean(reminderSet) } : renewal
          );
          if (shallowEqualRenewals(state.renewals, nextRenewals)) {
            return {};
          }
          return {
            renewals: nextRenewals,
            ...logRenewalsEventInternal(state, "ReminderSet", { id, reminderSet: Boolean(reminderSet) }),
          } satisfies Partial<UIState>;
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
      selectFilteredSortedRenewals: () => {
        const state = get();
        return computeFilteredSortedRenewals(state);
      },
      selectWindowCounts: () => {
        const state = get();
        return computeRenewalWindowCounts(state);
      },
      isReminderSet: (id) => get().renewals.some((renewal) => renewal.id === id && renewal.reminderSet),
      getRenewalStatusChip: (status) => renewalStatusChipMap[status] ?? renewalStatusChipMap.ok,
      selectPoliciesView: () => get().policies.map(policyToView),
      selectPolicyView: (policyId) => {
        const policy = get().policies.find((p) => p.id === policyId);
        return policy ? policyToView(policy) : undefined;
      },
      selectRenewalsView: () => get().renewals.map(renewalToView),
      selectFilteredSortedRenewalsView: () => {
        const filtered = get().selectFilteredSortedRenewals();
        return filtered.map(renewalToView);
      },
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
  if (!finite.length) return { min: 0, max: 0 } as const;
  return {
    min: Math.min(...finite),
    max: Math.max(...finite),
  } as const;
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

  const premiumValues = policies.map((policy) => safeNumber(moneyToMajor(policy.premium)));
  const deductibleValues = policies.map((policy) => safeNumber(moneyToMajor(policy.deductible)));
  const riderCounts = policies.map((policy) => safeNumber(policy.riders?.length ?? 0));
  const networkScores = policies.map((policy) => mapNetwork(policy.network));
  const serviceScores = policies.map((policy) => mapService(policy.service));

  const premiumRange = computeRange(premiumValues);
  const deductibleRange = computeRange(deductibleValues);
  const ridersRange = computeRange(riderCounts);

  return policies.map((policy, index) => {
    const breakdown: Record<ComparisonMetric, number> = {
      premium: normalizeLowerIsBetter(premiumValues[index], premiumRange),
      deductible: normalizeLowerIsBetter(deductibleValues[index], deductibleRange),
      riders: normalizeHigherIsBetter(riderCounts[index], ridersRange),
      network: networkScores[index],
      service: serviceScores[index],
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


