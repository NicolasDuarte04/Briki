"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceJurisdictions = exports.complianceChecklistItems = void 0;
exports.complianceChecklistItems = {
    co: [
        "co.item.kyc",
        "co.item.rut",
        "co.item.sarlaft",
        "co.item.pila",
        "co.item.beneficiary",
    ],
    mx: [
        "mx.item.kyc",
        "mx.item.constanciaFiscal",
        "mx.item.imss",
        "mx.item.infonavit",
        "mx.item.beneficiary",
    ],
    cl: [
        "cl.item.kyc",
        "cl.item.rut",
        "cl.item.afp",
        "cl.item.previred",
        "cl.item.beneficiary",
    ],
    br: [
        "br.item.kyc",
        "br.item.cnpj",
        "br.item.susep",
        "br.item.fgts",
        "br.item.beneficiary",
    ],
};
exports.complianceJurisdictions = Object.keys(exports.complianceChecklistItems);
