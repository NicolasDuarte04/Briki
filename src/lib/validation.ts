import { z } from "zod";

const IsoDateTimeStringSchema = z.string().datetime({ offset: true });
const UnknownRecordSchema = z.record(z.string(), z.unknown());

export const CurrencyCodeSchema = z.enum(["COP", "USD", "MXN", "EUR"]);
export type CurrencyCodeParsed = z.infer<typeof CurrencyCodeSchema>;

export const MoneySchema = z
  .object({
    amountMinor: z.number().int().min(0),
    currency: CurrencyCodeSchema,
  })
  .strict();
export type MoneyParsed = z.infer<typeof MoneySchema>;

export const NetworkLevelSchema = z.enum(["basic", "preferred", "concierge"]);
export type NetworkLevelParsed = z.infer<typeof NetworkLevelSchema>;

export const ServiceLevelSchema = z.enum(["standard", "enhanced", "white-glove"]);
export type ServiceLevelParsed = z.infer<typeof ServiceLevelSchema>;

export const PolicyStatusSchema = z.enum([
  "draft",
  "active",
  "suspended",
  "expired",
  "cancelled",
]);
export type PolicyStatusParsed = z.infer<typeof PolicyStatusSchema>;

export const RiderTypeSchema = z.enum([
  "health",
  "dental",
  "vision",
  "life",
  "disability",
  "wellness",
  "travel",
  "cyber",
]);
export type RiderTypeParsed = z.infer<typeof RiderTypeSchema>;

export const CoverageKindSchema = z.enum([
  "individual",
  "family",
  "group",
  "enterprise",
]);
export type CoverageKindParsed = z.infer<typeof CoverageKindSchema>;

export const ChannelSchema = z.enum(["direct", "broker", "agent", "marketplace", "api"]);
export type ChannelParsed = z.infer<typeof ChannelSchema>;

export const RenewalStatusSchema = z.enum(["ok", "dueSoon", "overdue"]);
export type RenewalStatusParsed = z.infer<typeof RenewalStatusSchema>;

export const RenewalWindowDaysSchema = z.union([
  z.literal(30),
  z.literal(60),
  z.literal(90),
]);
export type RenewalWindowDaysParsed = z.infer<typeof RenewalWindowDaysSchema>;

export const ComparisonPlaybookSchema = z.enum(["sme", "hnwi", "auto", "travel"]);
export type ComparisonPlaybookParsed = z.infer<typeof ComparisonPlaybookSchema>;

export const AuditEventTypeSchema = z.enum([
  "ComplianceOpen",
  "ChecklistToggle",
  "CompliancePass",
  "SendAttempt",
  "SendBlocked",
  "SendSuccess",
  "RenewalsViewOpen",
  "FilterChange",
  "SortChange",
  "NudgeQuote",
  "NudgeMessage",
  "ReminderOpen",
  "ReminderSet",
  "FollowupCadenceChanged",
]);
export type AuditEventTypeParsed = z.infer<typeof AuditEventTypeSchema>;

export const PricingBandTypeSchema = z.enum(["standard", "preferred", "premium", "custom"]);
export type PricingBandTypeParsed = z.infer<typeof PricingBandTypeSchema>;

export const JurisdictionCodeSchema = z.enum(["co", "mx", "cl", "br"]);
export type JurisdictionCodeParsed = z.infer<typeof JurisdictionCodeSchema>;

export const ShareChannelSchema = z.enum(["whatsapp", "email"]);
export type ShareChannelParsed = z.infer<typeof ShareChannelSchema>;

export const UIStepSchema = z.enum([
  "landing",
  "conversation",
  "sourcing",
  "normalized",
  "comparison",
  "proposal",
  "compliance",
  "followups",
]);
export type UIStepParsed = z.infer<typeof UIStepSchema>;

export const ComparisonMetricSchema = z.enum([
  "premium",
  "deductible",
  "riders",
  "network",
  "service",
]);
export type ComparisonMetricParsed = z.infer<typeof ComparisonMetricSchema>;

const CarrierContactSchema = z
  .object({
    email: z.string().optional(),
    phone: z.string().optional(),
    website: z.string().optional(),
  })
  .strict();

export const CarrierSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    jurisdictions: z.array(JurisdictionCodeSchema),
    contact: CarrierContactSchema.optional(),
    isActive: z.boolean(),
  })
  .strict();
export type CarrierParsed = z.infer<typeof CarrierSchema>;

const ProductBasePremiumRangeSchema = z
  .object({
    min: MoneySchema,
    max: MoneySchema,
  })
  .strict();

export const ProductSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    carrierId: z.string(),
    description: z.string().optional(),
    coverageKind: CoverageKindSchema,
    availableRiderIds: z.array(z.string()),
    basePremiumRange: ProductBasePremiumRangeSchema.optional(),
    metadata: UnknownRecordSchema.optional(),
    isActive: z.boolean(),
    createdAt: IsoDateTimeStringSchema,
    updatedAt: IsoDateTimeStringSchema,
  })
  .strict();
export type ProductParsed = z.infer<typeof ProductSchema>;

export const ClauseSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    requiredForProductIds: z.array(z.string()).optional(),
    jurisdiction: JurisdictionCodeSchema.optional(),
    version: z.number(),
    effectiveDate: IsoDateTimeStringSchema,
  })
  .strict();
export type ClauseParsed = z.infer<typeof ClauseSchema>;

export const RiderSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    code: z.string(),
    type: RiderTypeSchema,
    description: z.string().optional(),
    premiumAdjustment: MoneySchema,
    coverageDetails: UnknownRecordSchema.optional(),
    compatibleProductIds: z.array(z.string()),
    isActive: z.boolean(),
  })
  .strict();
export type RiderParsed = z.infer<typeof RiderSchema>;

const PricingBandEmployeeRangeSchema = z
  .object({
    min: z.number(),
    max: z.number().optional(),
  })
  .strict();

const PricingBandAgeRangeSchema = z
  .object({
    min: z.number(),
    max: z.number(),
  })
  .strict();

const PricingBandEffectiveDateRangeSchema = z
  .object({
    start: IsoDateTimeStringSchema,
    end: IsoDateTimeStringSchema.optional(),
  })
  .strict();

export const PricingBandSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: PricingBandTypeSchema,
    productId: z.string(),
    employeeRange: PricingBandEmployeeRangeSchema.optional(),
    ageRange: PricingBandAgeRangeSchema.optional(),
    basePremium: MoneySchema,
    deductibleOptions: z.array(MoneySchema),
    discountPercentage: z.number().optional(),
    effectiveDateRange: PricingBandEffectiveDateRangeSchema,
  })
  .strict();
export type PricingBandParsed = z.infer<typeof PricingBandSchema>;

const EligibilityGeographicRestrictionsSchema = z
  .object({
    jurisdictions: z.array(JurisdictionCodeSchema),
    cities: z.array(z.string()).optional(),
    regions: z.array(z.string()).optional(),
  })
  .strict();

export const EligibilitySchema = z
  .object({
    id: z.string(),
    productId: z.string(),
    minEmployees: z.number().optional(),
    maxEmployees: z.number().optional(),
    requiredBusinessTypes: z.array(z.string()).optional(),
    excludedBusinessTypes: z.array(z.string()).optional(),
    geographicRestrictions: EligibilityGeographicRestrictionsSchema.optional(),
    customCriteria: UnknownRecordSchema.optional(),
  })
  .strict();
export type EligibilityParsed = z.infer<typeof EligibilitySchema>;

export const ProvenanceEntityTypeSchema = z.enum([
  "product",
  "policy",
  "quote",
  "carrier",
  "rider",
]);
export type ProvenanceEntityTypeParsed = z.infer<typeof ProvenanceEntityTypeSchema>;

export const ProvenanceSchema = z
  .object({
    id: z.string(),
    entityType: ProvenanceEntityTypeSchema,
    entityId: z.string(),
    source: z.string(),
    sourceTimestamp: IsoDateTimeStringSchema,
    importTimestamp: IsoDateTimeStringSchema,
    sourceMetadata: UnknownRecordSchema.optional(),
    qualityScore: z.number().optional(),
  })
  .strict();
export type ProvenanceParsed = z.infer<typeof ProvenanceSchema>;

export const CaseStatusSchema = z.enum([
  "new",
  "in_progress",
  "quoted",
  "closed",
  "won",
  "lost",
]);
export type CaseStatusParsed = z.infer<typeof CaseStatusSchema>;

// ✅ CORRECCIÓN ARQUITECTÓNICA: Alinear con Prisma schema y CaseBrief interface
// Prisma: employees Int? → number | null en TypeScript
// CaseBrief: employees?: number | null
// Por lo tanto, el schema debe aceptar null explícitamente
//
// ✅ FASE 29: SINCRONIZACIÓN COMPLETA CON INTERFACE
// Todos los campos de CaseBrief en types.ts deben estar presentes aquí
export const CaseBriefSchema = z
  .object({
    businessType: z.string().optional(),
    employees: z.number().nullable().optional(), // ✅ Acepta: number | null | undefined
    coverage: z.string().optional(),
    freeText: z.string().optional(),
    // ✅ FASE 29: Campos faltantes agregados para sincronización completa
    clientName: z.string().optional(),
    selectedClientId: z.string().nullable().optional(),
    insurance_category: z.string().optional(),
    max_budget: z.number().nullable().optional(),
    budget_currency: z.enum(['COP', 'USD']).optional(),
    required_coverages: z.array(z.string()).optional(),
    client_profile: z.string().optional(),
    tempUploads: z.array(z.object({
      id: z.string(),
      storagePath: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      pageCount: z.number().optional(),
      charactersExtracted: z.number().optional(),
      fileHash: z.string().optional(),
      extractedText: z.string().optional(),
    })).optional(),
  })
  .strict();
export type CaseBriefParsed = z.infer<typeof CaseBriefSchema>;

const CaseCustomerSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    companyName: z.string().optional(),
  })
  .strict();

export const CaseSchema = z
  .object({
    id: z.string(),
    referenceNumber: z.string(),
    brief: CaseBriefSchema,
    // ✅ CORRECCIÓN: Agregar clientName que existe en BD pero faltaba en schema
    clientName: z.string().nullable().optional(),
    brokerId: z.string().optional(),
    customer: CaseCustomerSchema.optional(),
    status: CaseStatusSchema,
    channel: ChannelSchema,
    policyIds: z.array(z.string()),
    quoteIds: z.array(z.string()),
    createdAt: IsoDateTimeStringSchema,
    updatedAt: IsoDateTimeStringSchema,
    // Nuevos campos del Brief detallado
    insurance_category: z.string().optional(),
    max_budget: z.number().optional(),
    budget_currency: z.enum(['COP', 'USD']).optional().default('COP'),
    required_coverages: z.array(z.string()).optional().default([]),
    client_profile: z.string().optional(),
  })
  .strict();
export type CaseParsed = z.infer<typeof CaseSchema>;

export const ArtifactTypeSchema = z.enum([
  "proposal",
  "quote",
  "policy_document",
  "comparison_report",
  "compliance_checklist",
]);
export type ArtifactTypeParsed = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactSchema = z
  .object({
    id: z.string(),
    type: ArtifactTypeSchema,
    caseId: z.string(),
    name: z.string(),
    generatedAt: IsoDateTimeStringSchema,
    expiresAt: IsoDateTimeStringSchema.optional(),
    shareUrl: z.string().optional(),
    metadata: UnknownRecordSchema.optional(),
    content: z.unknown().optional(),
  })
  .strict();
export type ArtifactParsed = z.infer<typeof ArtifactSchema>;

export const PolicySchema = z
  .object({
    id: z.string(),
    plan: z.string(),
    policyNumber: z.string().optional(),
    productId: z.string().optional(),
    carrierId: z.string().optional(),
    premium: MoneySchema,
    deductible: MoneySchema,
    riders: z.array(z.string()),
    network: NetworkLevelSchema.optional(),
    service: ServiceLevelSchema.optional(),
    status: PolicyStatusSchema.optional(),
    effectiveDate: IsoDateTimeStringSchema.optional(),
    expirationDate: IsoDateTimeStringSchema.optional(),
    renewalDate: IsoDateTimeStringSchema.optional(),
  })
  .strict();
export type PolicyParsed = z.infer<typeof PolicySchema>;

export const BrokerProfileSchema = z
  .object({
    name: z.string(),
    agency: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    brandColor: z.string(),
    logoUrl: z.string().optional(),
  })
  .strict();
export type BrokerProfileParsed = z.infer<typeof BrokerProfileSchema>;

export const ProposalSelectedPlanSchema = z
  .object({
    planId: z.string(),
    rationaleKey: z.string().optional(),
  })
  .strict();
export type ProposalSelectedPlanParsed = z.infer<typeof ProposalSelectedPlanSchema>;

export const ProposalMathCheckSchema = z
  .object({
    passed: z.boolean(),
    messageKey: z.string(),
  })
  .strict();
export type ProposalMathCheckParsed = z.infer<typeof ProposalMathCheckSchema>;

export const ProposalSchema = z
  .object({
    id: z.string(),
    caseId: z.string(),
    broker: BrokerProfileSchema,
    brief: CaseBriefSchema,
    selectedPlans: z.array(ProposalSelectedPlanSchema),
    disclosuresKeys: z.array(z.string()),
    mathCheck: ProposalMathCheckSchema,
    shareUrl: z.string(),
    generatedOn: IsoDateTimeStringSchema,
    metadata: UnknownRecordSchema.optional(),
  })
  .strict();
export type ProposalParsed = z.infer<typeof ProposalSchema>;

export const RenewalRecordSchema = z
  .object({
    id: z.string(),
    carrier: z.string(),
    plan: z.string(),
    renewalDateISO: IsoDateTimeStringSchema,
    premium: MoneySchema,
    status: RenewalStatusSchema,
    reminderSet: z.boolean(),
    policyId: z.string().optional(),
  })
  .strict();
export type RenewalRecordParsed = z.infer<typeof RenewalRecordSchema>;

export const ComparisonWeightsSchema = z
  .object({
    premium: z.number(),
    deductible: z.number(),
    riders: z.number(),
    network: z.number(),
    service: z.number(),
  })
  .strict();
export type ComparisonWeightsParsed = z.infer<typeof ComparisonWeightsSchema>;

export const PlaybookSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    type: ComparisonPlaybookSchema,
    weights: ComparisonWeightsSchema,
    description: z.string().optional(),
    targetSegment: z.string().optional(),
  })
  .strict();
export type PlaybookParsed = z.infer<typeof PlaybookSchema>;

export const AuditEntrySchema = z
  .object({
    id: z.string(),
    type: AuditEventTypeSchema,
    entityType: z.string(),
    entityId: z.string(),
    actorId: z.string().optional(),
    timestamp: IsoDateTimeStringSchema,
    payload: UnknownRecordSchema.optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional(),
  })
  .strict();
export type AuditEntryParsed = z.infer<typeof AuditEntrySchema>;

export const PolicyComparisonScoreSchema = z
  .object({
    plan: z.string(),
    total: z.number(),
    breakdown: z.record(ComparisonMetricSchema, z.number()),
  })
  .strict();
export type PolicyComparisonScoreParsed = z.infer<typeof PolicyComparisonScoreSchema>;

export const RenewalsSortBySchema = z.enum(["date", "premium"]);
export type RenewalsSortByParsed = z.infer<typeof RenewalsSortBySchema>;

export const RenewalsSortDirSchema = z.enum(["asc", "desc"]);
export type RenewalsSortDirParsed = z.infer<typeof RenewalsSortDirSchema>;

export const RenewalsSortingSchema = z
  .object({
    sortBy: RenewalsSortBySchema,
    sortDir: RenewalsSortDirSchema,
  })
  .strict();
export type RenewalsSortingParsed = z.infer<typeof RenewalsSortingSchema>;

export const RenewalsFiltersSchema = z
  .object({
    windowDays: RenewalWindowDaysSchema,
    carriers: z.array(z.string()),
    statuses: z.array(RenewalStatusSchema),
  })
  .strict();
export type RenewalsFiltersParsed = z.infer<typeof RenewalsFiltersSchema>;

export const SharePayloadSchema = z
  .object({
    channel: ShareChannelSchema,
    jurisdiction: z.string(),
    proposal: ProposalSchema,
  })
  .strict();
export type SharePayloadParsed = z.infer<typeof SharePayloadSchema>;

export const ComplianceCheckedStateSchema = z.record(
  JurisdictionCodeSchema,
  z.record(z.string(), z.boolean())
);
export type ComplianceCheckedStateParsed = z.infer<typeof ComplianceCheckedStateSchema>;

export const RenewalStatusChipToneSchema = z.enum(["neutral", "warning", "critical"]);
export type RenewalStatusChipToneParsed = z.infer<typeof RenewalStatusChipToneSchema>;

export const RenewalStatusChipPropsSchema = z
  .object({
    label: z.string(),
    tone: RenewalStatusChipToneSchema,
  })
  .strict();
export type RenewalStatusChipPropsParsed = z.infer<typeof RenewalStatusChipPropsSchema>;


