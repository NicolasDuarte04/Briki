import { z } from "zod";

import {
  Case,
  Eligibility,
  Policy,
  PricingBand,
  Product,
  Proposal,
  Provenance,
  Rider,
  RenewalRecord,
} from "./types";
import {
  CaseSchema,
  EligibilitySchema,
  PolicySchema,
  PricingBandSchema,
  ProductSchema,
  ProposalSchema,
  ProvenanceSchema,
  RiderSchema,
  RenewalRecordSchema,
} from "./validation";

const PoliciesSchema = z.array(PolicySchema);
const ProductsSchema = z.array(ProductSchema);
const RidersSchema = z.array(RiderSchema);
const PricingBandsSchema = z.array(PricingBandSchema);
const EligibilitiesSchema = z.array(EligibilitySchema);
const ProvenancesSchema = z.array(ProvenanceSchema);
const CasesSchema = z.array(CaseSchema);
const ProposalsSchema = z.array(ProposalSchema);
const RenewalsSchema = z.array(RenewalRecordSchema);

let policiesPromise: Promise<Policy[]> | undefined;
let productsPromise: Promise<Product[]> | undefined;
let ridersPromise: Promise<Rider[]> | undefined;
let pricingBandsPromise: Promise<PricingBand[]> | undefined;
let eligibilitiesPromise: Promise<Eligibility[]> | undefined;
let provenancePromise: Promise<Provenance[]> | undefined;
let casesPromise: Promise<Case[]> | undefined;
let proposalsPromise: Promise<Proposal[]> | undefined;
let renewalsPromise: Promise<RenewalRecord[]> | undefined;

export function getUseMocks(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCKS === "true";
}

export async function loadPolicies(): Promise<Policy[]> {
  if (!policiesPromise) {
    policiesPromise = (async () => {
      if (!getUseMocks()) {
        return [] as Policy[];
      }

      try {
        const module = await import("../mocks/policies.json");
        return parseArrayOrWarn(PoliciesSchema, module.default, "loadPolicies", "policies.json");
      } catch (_error) {
        warnImportFailure("loadPolicies", "policies.json");
        return [] as Policy[];
      }
    })();
  }

  return policiesPromise;
}

export async function loadProducts(): Promise<Product[]> {
  if (!productsPromise) {
    productsPromise = (async () => {
      if (!getUseMocks()) {
        return [] as Product[];
      }

      try {
        const module = await import("../mocks/products.json");
        return parseArrayOrWarn(ProductsSchema, module.default, "loadProducts", "products.json");
      } catch (_error) {
        warnImportFailure("loadProducts", "products.json");
        return [] as Product[];
      }
    })();
  }

  return productsPromise;
}

export async function loadRiders(): Promise<Rider[]> {
  if (!ridersPromise) {
    ridersPromise = (async () => {
      if (!getUseMocks()) {
        return [] as Rider[];
      }

      try {
        const module = await import("../mocks/riders.json");
        return parseArrayOrWarn(RidersSchema, module.default, "loadRiders", "riders.json");
      } catch (_error) {
        warnImportFailure("loadRiders", "riders.json");
        return [] as Rider[];
      }
    })();
  }

  return ridersPromise;
}

export async function loadPricingBands(): Promise<PricingBand[]> {
  if (!pricingBandsPromise) {
    pricingBandsPromise = (async () => {
      if (!getUseMocks()) {
        return [] as PricingBand[];
      }

      try {
        const module = await import("../mocks/pricingBands.json");
        return parseArrayOrWarn(
          PricingBandsSchema,
          module.default,
          "loadPricingBands",
          "pricingBands.json"
        );
      } catch (_error) {
        warnImportFailure("loadPricingBands", "pricingBands.json");
        return [] as PricingBand[];
      }
    })();
  }

  return pricingBandsPromise;
}

export async function loadEligibilities(): Promise<Eligibility[]> {
  if (!eligibilitiesPromise) {
    eligibilitiesPromise = (async () => {
      if (!getUseMocks()) {
        return [] as Eligibility[];
      }

      try {
        const module = await import("../mocks/eligibilities.json");
        return parseArrayOrWarn(
          EligibilitiesSchema,
          module.default,
          "loadEligibilities",
          "eligibilities.json"
        );
      } catch (_error) {
        warnImportFailure("loadEligibilities", "eligibilities.json");
        return [] as Eligibility[];
      }
    })();
  }

  return eligibilitiesPromise;
}

export async function loadProvenance(): Promise<Provenance[]> {
  if (!provenancePromise) {
    provenancePromise = (async () => {
      if (!getUseMocks()) {
        return [] as Provenance[];
      }

      try {
        const module = await import("../mocks/provenance.json");
        return parseArrayOrWarn(
          ProvenancesSchema,
          module.default,
          "loadProvenance",
          "provenance.json"
        );
      } catch (_error) {
        warnImportFailure("loadProvenance", "provenance.json");
        return [] as Provenance[];
      }
    })();
  }

  return provenancePromise;
}

export async function loadCases(): Promise<Case[]> {
  if (!casesPromise) {
    casesPromise = (async () => {
      if (!getUseMocks()) {
        return [] as Case[];
      }

      try {
        const module = await import("../mocks/cases.json");
        return parseArrayOrWarn(CasesSchema, module.default, "loadCases", "cases.json");
      } catch (_error) {
        warnImportFailure("loadCases", "cases.json");
        return [] as Case[];
      }
    })();
  }

  return casesPromise;
}

export async function loadProposals(): Promise<Proposal[]> {
  if (!proposalsPromise) {
    proposalsPromise = (async () => {
      if (!getUseMocks()) {
        return [] as Proposal[];
      }

      try {
        const module = await import("../mocks/proposals.json");
        return parseArrayOrWarn(
          ProposalsSchema,
          module.default,
          "loadProposals",
          "proposals.json"
        );
      } catch (_error) {
        warnImportFailure("loadProposals", "proposals.json");
        return [] as Proposal[];
      }
    })();
  }

  return proposalsPromise;
}

export async function loadRenewals(): Promise<RenewalRecord[]> {
  if (!renewalsPromise) {
    renewalsPromise = (async () => {
      if (!getUseMocks()) {
        return [] as RenewalRecord[];
      }

      try {
        const module = await import("../mocks/renewals.json");
        return parseArrayOrWarn(
          RenewalsSchema,
          module.default,
          "loadRenewals",
          "renewals.json"
        );
      } catch (error) {
        if (isModuleNotFound(error, "renewals.json")) {
          return [] as RenewalRecord[];
        }

        warnImportFailure("loadRenewals", "renewals.json");
        return [] as RenewalRecord[];
      }
    })();
  }

  return renewalsPromise;
}

function parseArrayOrWarn<T>(
  schema: z.ZodType<T[]>,
  data: unknown,
  loaderName: string,
  fileName: string
): T[] {
  const parsed = schema.safeParse(data);

  if (parsed.success) {
    return parsed.data;
  }

  const issues = parsed.error.issues;
  const firstIssue = issues[0];
  const path = firstIssue?.path?.length ? firstIssue.path.join(".") : "root";
  const message = firstIssue?.message ?? "Validation failed";

  warnMalformed(loaderName, fileName, issues.length, `${path} ${message}`);

  return [] as T[];
}

function warnImportFailure(loaderName: string, fileName: string): void {
  warnMalformed(loaderName, fileName, 1, "import failed");
}

function warnMalformed(loaderName: string, fileName: string, errors: number, first: string): void {
  console.warn(`[data.malformed] fx.${loaderName} ${fileName}`, {
    errors,
    first,
  });
}

function isModuleNotFound(error: unknown, filename: string): boolean {
  if (!error) {
    return false;
  }

  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: string }).code;
    if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
      return true;
    }
  }

  if (error instanceof Error) {
    return error.message.includes(filename) && error.message.includes("Cannot find module");
  }

  return false;
}

