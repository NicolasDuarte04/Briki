"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUI = exports.comparisonMetrics = void 0;
const zustand_1 = require("zustand");
const middleware_1 = require("zustand/middleware");
const compliance_1 = require("../compliance");
exports.comparisonMetrics = ["premium", "deductible", "riders", "network", "service"];
const playbookPresets = {
    sme: { premium: 45, deductible: 35, riders: 20, network: 15, service: 10 },
    hnwi: { premium: 20, deductible: 20, riders: 35, network: 45, service: 40 },
    auto: { premium: 50, deductible: 40, riders: 15, network: 10, service: 10 },
    travel: { premium: 30, deductible: 20, riders: 40, network: 50, service: 30 },
};
const defaultComparisonWeights = { ...playbookPresets.sme };
const seededPolicies = [
    {
        plan: "Starter",
        premium: 1200,
        deductible: 5000,
        riders: ["Cyber", "Dental"],
        network: "basic",
        service: "standard",
    },
    {
        plan: "Growth",
        premium: 1850,
        deductible: 3000,
        riders: ["Vision", "Wellness"],
        network: "preferred",
        service: "enhanced",
    },
    {
        plan: "Premium",
        premium: 2450,
        deductible: 1500,
        riders: ["Cyber", "Telemedicine", "Maternity"],
        network: "preferred",
        service: "white-glove",
    },
    {
        plan: "Enterprise",
        premium: 3200,
        deductible: 1000,
        riders: ["Executive Physical", "Global Travel"],
        network: "concierge",
        service: "white-glove",
    },
];
const defaultBrokerProfile = {
    name: "Camila Duarte",
    agency: "Andes Advisory Group",
    email: "camila@andesadvisory.com",
    phone: "+57 320 123 4567",
    brandColor: "#0F766E",
    logoUrl: undefined,
};
const defaultProposalSelectedPlans = seededPolicies.slice(0, 3).map((policy) => ({
    planId: policy.plan,
    rationaleKey: "selectedPlans.defaultRationale",
}));
const defaultProposalDisclosuresKeys = [
    "disclosures.items.0",
    "disclosures.items.1",
    "disclosures.items.2",
];
const defaultProposalMathCheck = {
    passed: true,
    messageKey: "mathCheck.messages.passed",
};
const DEFAULT_PROPOSAL_SHARE_URL = "https://briki.app/share/demo-proposal";
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}){1,2}$/;
function asTrimmedString(value) {
    if (typeof value !== "string")
        return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
}
function sanitizeBrandColor(value, fallback) {
    if (!value)
        return fallback;
    return HEX_COLOR_REGEX.test(value) ? value : fallback;
}
function sanitizeBrokerProfile(current, updates) {
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
function sanitizeSelectedPlans(plans) {
    const source = Array.isArray(plans) ? plans : defaultProposalSelectedPlans;
    const seen = new Set();
    const sanitized = source.reduce((acc, plan) => {
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
function sanitizeDisclosureKeys(keys) {
    if (!Array.isArray(keys)) {
        return [...defaultProposalDisclosuresKeys];
    }
    const sanitized = [];
    for (const key of keys) {
        const trimmed = asTrimmedString(key);
        if (!trimmed || sanitized.includes(trimmed))
            continue;
        sanitized.push(trimmed);
    }
    return sanitized.length ? sanitized : [...defaultProposalDisclosuresKeys];
}
function sanitizeMathCheck(mathCheck) {
    if (!mathCheck) {
        return { ...defaultProposalMathCheck };
    }
    return {
        passed: typeof mathCheck.passed === "boolean" ? mathCheck.passed : defaultProposalMathCheck.passed,
        messageKey: asTrimmedString(mathCheck.messageKey) ?? defaultProposalMathCheck.messageKey,
    };
}
function sanitizeShareUrl(url) {
    const trimmed = asTrimmedString(url);
    if (!trimmed)
        return DEFAULT_PROPOSAL_SHARE_URL;
    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
            return parsed.toString();
        }
        return DEFAULT_PROPOSAL_SHARE_URL;
    }
    catch {
        return DEFAULT_PROPOSAL_SHARE_URL;
    }
}
exports.useUI = (0, zustand_1.create)()((0, middleware_1.devtools)((set, get) => ({
    step: "landing",
    isSourcing: false,
    rightOpen: true,
    complianceOpen: false,
    complianceJurisdiction: compliance_1.complianceJurisdictions[0] ?? "co",
    checked: createDefaultComplianceChecked(),
    complianceAuditLog: [],
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
    setStep: (step) => set((state) => {
        if (state.isSourcing && step !== "conversation") {
            return {};
        }
        return { step };
    }),
    toggleRight: () => set((state) => ({ rightOpen: !state.rightOpen })),
    openCompliance: (jurisdiction) => set((state) => ({
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
    toggleCompliance: (itemId) => set((state) => {
        const jurisdiction = state.complianceJurisdiction;
        const items = compliance_1.complianceChecklistItems[jurisdiction];
        if (!items?.includes(itemId)) {
            return {};
        }
        const currentJurisdictionState = state.checked[jurisdiction] ?? {};
        const nextValue = !Boolean(currentJurisdictionState[itemId]);
        const nextChecked = {
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
    passCompliance: (jurisdiction) => set((state) => {
        const items = compliance_1.complianceChecklistItems[jurisdiction];
        if (!items) {
            return {};
        }
        const nextJurisdictionState = items.reduce((acc, item) => {
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
    resetCompliance: (jurisdiction) => set((state) => {
        const targets = jurisdiction ? [jurisdiction] : compliance_1.complianceJurisdictions;
        let nextChecked = state.checked;
        let nextLog = state.complianceAuditLog;
        let updated = false;
        for (const target of targets) {
            const items = compliance_1.complianceChecklistItems[target];
            if (!items)
                continue;
            const resetState = items.reduce((acc, item) => {
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
        const items = compliance_1.complianceChecklistItems[jurisdiction];
        if (!items?.length)
            return false;
        const checked = get().checked[jurisdiction];
        if (!checked)
            return false;
        return items.every((item) => Boolean(checked[item]));
    },
    logComplianceSendAttempt: (payload) => set((state) => ({
        complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, {
            type: "SendAttempt",
            ts: Date.now(),
            payload,
        }),
    })),
    logComplianceSendBlocked: (payload) => set((state) => ({
        complianceAuditLog: appendComplianceEvent(state.complianceAuditLog, {
            type: "SendBlocked",
            ts: Date.now(),
            payload,
        }),
    })),
    logComplianceSendSuccess: (payload) => set((state) => ({
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
    setBrief: (brief) => set((state) => ({ brief: { ...state.brief, ...brief } })),
    setPolicies: (policies) => set((state) => ({
        policies,
        policiesLoaded: true,
        policiesLoading: false,
        comparisonScores: computeComparisonScores(policies, state.comparisonWeights),
    })),
    fetchPolicies: async () => {
        const { policiesLoading, policiesLoaded } = get();
        if (policiesLoading || policiesLoaded) {
            return;
        }
        set(() => ({ policiesLoading: true }));
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            get().setPolicies(seededPolicies);
        }
        catch (error) {
            set(() => ({ policiesLoading: false }));
            throw error;
        }
    },
    setComparisonWeights: (weights) => set((state) => computeNextComparisonState(state, weights)),
    resetComparisonWeights: () => set((state) => computeNextComparisonState(state, defaultComparisonWeights, state.comparisonPlaybook, true)),
    setComparisonPlaybook: (playbook) => set((state) => computeNextComparisonState(state, playbookPresets[playbook], playbook, true)),
    scorePolicy: (policy, weights) => {
        const activeWeights = weights ?? get().comparisonWeights;
        return computeComparisonScores([policy], activeWeights)[0] ?? {
            plan: policy.plan,
            total: 0,
            breakdown: createEmptyBreakdown(),
        };
    },
    setProposalBrokerProfile: (profile) => set((state) => ({
        proposalBrokerProfile: sanitizeBrokerProfile(state.proposalBrokerProfile, profile),
    })),
    setProposalSelectedPlans: (plans) => set(() => ({
        proposalSelectedPlans: sanitizeSelectedPlans(plans),
    })),
    setProposalDisclosuresKeys: (keys) => set(() => ({ proposalDisclosuresKeys: sanitizeDisclosureKeys(keys) })),
    addProposalDisclosureKey: (key) => set((state) => {
        const next = sanitizeDisclosureKeys([...state.proposalDisclosuresKeys, key]);
        return next.length === state.proposalDisclosuresKeys.length
            ? {}
            : { proposalDisclosuresKeys: next };
    }),
    clearProposalDisclosures: () => set(() => ({ proposalDisclosuresKeys: [...defaultProposalDisclosuresKeys] })),
    setProposalMathCheck: (mathCheck) => set(() => ({ proposalMathCheck: sanitizeMathCheck(mathCheck) })),
    setProposalShareUrl: (url) => set(() => ({ proposalShareUrl: sanitizeShareUrl(url) })),
    setProposalLoading: (loading) => set(() => ({ proposalLoading: Boolean(loading) })),
    setProposalGeneratedOn: (date) => set(() => ({ proposalGeneratedOn: asTrimmedString(date) ?? null })),
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
}), { name: "ui-store" }));
function sanitizeWeightValue(value) {
    if (typeof value !== "number" || !Number.isFinite(value))
        return 0;
    if (value < 0)
        return 0;
    if (value > 100)
        return 100;
    return Math.round(value);
}
function createEmptyBreakdown() {
    return exports.comparisonMetrics.reduce((acc, metric) => {
        acc[metric] = 0;
        return acc;
    }, {});
}
function safeNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value))
        return 0;
    return value;
}
function computeRange(values) {
    const finite = values.filter((v) => Number.isFinite(v));
    if (!finite.length)
        return { min: 0, max: 0 };
    return {
        min: Math.min(...finite),
        max: Math.max(...finite),
    };
}
function normalizeLowerIsBetter(value, range) {
    if (range.max === range.min)
        return 1;
    const normalized = (range.max - value) / (range.max - range.min);
    if (!Number.isFinite(normalized))
        return 0;
    if (normalized < 0)
        return 0;
    if (normalized > 1)
        return 1;
    return normalized;
}
function normalizeHigherIsBetter(value, range) {
    if (range.max === range.min)
        return 1;
    const normalized = (value - range.min) / (range.max - range.min);
    if (!Number.isFinite(normalized))
        return 0;
    if (normalized < 0)
        return 0;
    if (normalized > 1)
        return 1;
    return normalized;
}
function computeComparisonScores(policies, weights) {
    if (!policies.length)
        return [];
    const sanitized = sanitizeWeights(weights);
    const totalWeight = exports.comparisonMetrics.reduce((sum, metric) => sum + sanitized[metric], 0);
    const normalizedWeights = totalWeight > 0
        ? exports.comparisonMetrics.reduce((acc, metric) => {
            acc[metric] = sanitized[metric] / totalWeight;
            return acc;
        }, {})
        : fallbackEqualWeights();
    const premiumValues = policies.map((policy) => safeNumber(policy.premium));
    const deductibleValues = policies.map((policy) => safeNumber(policy.deductible));
    const riderCounts = policies.map((policy) => safeNumber(policy.riders?.length ?? 0));
    const networkScores = policies.map((policy) => mapNetwork(policy.network));
    const serviceScores = policies.map((policy) => mapService(policy.service));
    const premiumRange = computeRange(premiumValues);
    const deductibleRange = computeRange(deductibleValues);
    const ridersRange = computeRange(riderCounts);
    return policies.map((policy, index) => {
        const breakdown = {
            premium: normalizeLowerIsBetter(premiumValues[index], premiumRange),
            deductible: normalizeLowerIsBetter(deductibleValues[index], deductibleRange),
            riders: normalizeHigherIsBetter(riderCounts[index], ridersRange),
            network: networkScores[index],
            service: serviceScores[index],
        };
        const total = exports.comparisonMetrics.reduce((sum, metric) => sum + breakdown[metric] * normalizedWeights[metric], 0) * 100;
        return {
            plan: policy.plan,
            total: Number.isFinite(total) ? Math.round(total * 10) / 10 : 0,
            breakdown,
        };
    });
}
function fallbackEqualWeights() {
    const equalWeight = 1 / exports.comparisonMetrics.length;
    return exports.comparisonMetrics.reduce((acc, metric) => {
        acc[metric] = equalWeight;
        return acc;
    }, {});
}
function mapNetwork(level) {
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
function mapService(level) {
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
function computeNextComparisonState(state, weights, playbook = state.comparisonPlaybook, override = false) {
    const merged = override
        ? sanitizeWeights(weights)
        : sanitizeWeights({
            ...state.comparisonWeights,
            ...weights,
        });
    return {
        comparisonPlaybook: playbook,
        comparisonWeights: merged,
        comparisonScores: computeComparisonScores(state.policies, merged),
    };
}
function sanitizeWeights(weights) {
    return exports.comparisonMetrics.reduce((acc, metric) => {
        acc[metric] = sanitizeWeightValue(weights[metric] ?? 0);
        return acc;
    }, {});
}
function createDefaultComplianceChecked() {
    return Object.entries(compliance_1.complianceChecklistItems).reduce((acc, [jurisdiction, items]) => {
        acc[jurisdiction] = items.reduce((itemAcc, item) => {
            itemAcc[item] = false;
            return itemAcc;
        }, {});
        return acc;
    }, {});
}
function ensureComplianceCheckedForJurisdiction(checked, jurisdiction) {
    const items = compliance_1.complianceChecklistItems[jurisdiction];
    if (!items) {
        return checked;
    }
    const existing = checked[jurisdiction] ?? {};
    let mutated = false;
    const next = { ...existing };
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
function appendComplianceEvent(log, event) {
    if (log.length === 0) {
        return [event];
    }
    return [...log, event];
}
function shallowEqualComplianceState(current, next) {
    if (!current)
        return false;
    const currentKeys = Object.keys(current);
    const nextKeys = Object.keys(next);
    if (currentKeys.length !== nextKeys.length) {
        return false;
    }
    for (const key of nextKeys) {
        if (current[key] !== next[key]) {
            return false;
        }
    }
    return true;
}
