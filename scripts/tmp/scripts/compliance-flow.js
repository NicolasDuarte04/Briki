"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const state_1 = require("../src/lib/ui/state");
const compliance_1 = require("../src/lib/compliance");
const share_1 = require("../src/lib/share");
function cloneAudit() {
    return [...state_1.useUI.getState().complianceAuditLog];
}
async function main() {
    const initialState = state_1.useUI.getState();
    const jurisdiction = initialState.complianceJurisdiction;
    // Ensure clean slate for the scenario
    state_1.useUI.getState().resetCompliance(jurisdiction);
    const payload = {
        channel: "whatsapp",
        jurisdiction,
        proposal: state_1.useUI.getState().getProposalData(),
    };
    // Step 1 – attempt send while blocked
    state_1.useUI.getState().logComplianceSendAttempt(payload);
    state_1.useUI.getState().logComplianceSendBlocked(payload);
    state_1.useUI.getState().openCompliance(jurisdiction);
    // Step 2 – check every item then pass
    const items = compliance_1.complianceChecklistItems[jurisdiction] ?? [];
    items.forEach((itemId) => {
        state_1.useUI.getState().toggleCompliance(itemId);
    });
    const ready = state_1.useUI.getState().isCompliancePassed(jurisdiction);
    if (!ready) {
        throw new Error("Checklist did not reach pass state after toggles");
    }
    state_1.useUI.getState().passCompliance(jurisdiction);
    state_1.useUI.getState().closeCompliance();
    // Step 3 – send via email with checklist passed
    const emailPayload = {
        channel: "email",
        jurisdiction,
        proposal: state_1.useUI.getState().getProposalData(),
    };
    state_1.useUI.getState().logComplianceSendAttempt(emailPayload);
    await (0, share_1.sendViaEmail)(emailPayload);
    state_1.useUI.getState().logComplianceSendSuccess(emailPayload);
    // Step 4 – simulate successful WhatsApp send after pass (optional check)
    state_1.useUI.getState().logComplianceSendAttempt(payload);
    await (0, share_1.sendViaWhatsApp)(payload);
    state_1.useUI.getState().logComplianceSendSuccess(payload);
    const auditLog = cloneAudit();
    const summary = {
        jurisdiction,
        checklistPassed: state_1.useUI.getState().isCompliancePassed(jurisdiction),
        totalEvents: auditLog.length,
        events: auditLog,
    };
    console.log(JSON.stringify(summary, null, 2));
}
main().catch((error) => {
    console.error("compliance-flow script failed", error);
    process.exitCode = 1;
});
