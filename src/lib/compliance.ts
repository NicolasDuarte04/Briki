export type JurisdictionCode = "co" | "mx" | "cl" | "br";

export type ComplianceChecklistMap = Record<JurisdictionCode, readonly string[]>;

export const complianceChecklistItems: ComplianceChecklistMap = {
  co: [
    "co_item_kyc",
    "co_item_rut",
    "co_item_sarlaft",
    "co_item_pila",
    "co_item_beneficiary",
  ],
  mx: [
    "mx_item_kyc",
    "mx_item_constanciaFiscal",
    "mx_item_imss",
    "mx_item_infonavit",
    "mx_item_beneficiary",
  ],
  cl: [
    "cl_item_kyc",
    "cl_item_rut",
    "cl_item_afp",
    "cl_item_previred",
    "cl_item_beneficiary",
  ],
  br: [
    "br_item_kyc",
    "br_item_cnpj",
    "br_item_susep",
    "br_item_fgts",
    "br_item_beneficiary",
  ],
} as const;

export const complianceJurisdictions = Object.keys(complianceChecklistItems) as JurisdictionCode[];

