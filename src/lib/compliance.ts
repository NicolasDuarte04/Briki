export type JurisdictionCode = "co" | "mx" | "ec" | "br";

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
  ec: [
    "ec_item_kyc",
    "ec_item_ruc",
    "ec_item_sri",
    "ec_item_iess",
    "ec_item_beneficiary",
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

/** Flag emojis for jurisdiction display */
export const JURISDICTION_FLAGS: Record<JurisdictionCode, string> = {
  co: '🇨🇴',
  mx: '🇲🇽',
  ec: '🇪🇨',
  br: '🇧🇷',
};

