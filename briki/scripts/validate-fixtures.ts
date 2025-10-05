import { z } from "zod";

import {
  loadCases,
  loadEligibilities,
  loadPolicies,
  loadPricingBands,
  loadProducts,
  loadProposals,
  loadProvenance,
  loadRenewals,
  loadRiders,
} from "../src/lib/fx";
import {
  CaseSchema,
  EligibilitySchema,
  PolicySchema,
  PricingBandSchema,
  ProductSchema,
  ProposalSchema,
  ProvenanceSchema,
  RenewalRecordSchema,
  RiderSchema,
} from "../src/lib/validation";
import type { PolicyParsed } from "../src/lib/validation";

process.env.NEXT_PUBLIC_USE_MOCKS = "true";

type EntityKey =
  | "products"
  | "policies"
  | "riders"
  | "pricingBands"
  | "eligibilities"
  | "provenance"
  | "cases"
  | "proposals"
  | "renewals";

type SchemaConfig = {
  entity: EntityKey;
  schema: z.ZodTypeAny;
  expectsArray: boolean;
  loader?: () => Promise<unknown>;
};

type EntityDataset<T> = {
  records: T[];
  ids: Set<string>;
};

type FileResult = {
  file: string;
  entity: EntityKey | null;
  count: number;
  zodOk: boolean;
  zodIssueCount: number;
  zodMessages: string[];
  idsUnique: boolean | null;
  duplicateIds: string[];
  missingIds: number[];
  fkStatus: "PASS" | "FAIL";
  notes: string[];
  failureCount: number;
};

type RelationshipOutcome = {
  description: string;
  source: EntityKey;
  status: "PASS" | "FAIL" | "SKIP";
  resolved?: number;
  total?: number;
  missingDetails?: string[];
  details?: string;
};

type RelationshipDefinition =
  | {
      description: string;
      source: EntityKey;
      target: EntityKey;
      field: string;
      kind: "single" | "array";
      optional?: boolean;
    }
  | {
      description: string;
      source: EntityKey;
      field: string;
      typeField: string;
      kind: "polymorphic";
      polymorphicTargets: Record<string, EntityKey>;
    };

const schemaConfigs: Record<string, SchemaConfig> = {
  "products.json": {
    entity: "products",
    schema: z.array(ProductSchema),
    expectsArray: true,
    loader: loadProducts,
  },
  "policies.json": {
    entity: "policies",
    schema: z.array(PolicySchema),
    expectsArray: true,
    loader: loadPolicies,
  },
  "riders.json": {
    entity: "riders",
    schema: z.array(RiderSchema),
    expectsArray: true,
    loader: loadRiders,
  },
  "pricingBands.json": {
    entity: "pricingBands",
    schema: z.array(PricingBandSchema),
    expectsArray: true,
    loader: loadPricingBands,
  },
  "eligibilities.json": {
    entity: "eligibilities",
    schema: z.array(EligibilitySchema),
    expectsArray: true,
    loader: loadEligibilities,
  },
  "provenance.json": {
    entity: "provenance",
    schema: z.array(ProvenanceSchema),
    expectsArray: true,
    loader: loadProvenance,
  },
  "cases.json": {
    entity: "cases",
    schema: z.array(CaseSchema),
    expectsArray: true,
    loader: loadCases,
  },
  "proposals.json": {
    entity: "proposals",
    schema: z.array(ProposalSchema),
    expectsArray: true,
    loader: loadProposals,
  },
  "renewals.json": {
    entity: "renewals",
    schema: z.array(RenewalRecordSchema),
    expectsArray: true,
    loader: loadRenewals,
  },
};

const formatIssues = (error: z.ZodError<unknown>): string =>
  error.issues
    .map((issue) => {
      const pathText = issue.path.length ? issue.path.join(".") : "<root>";
      return `${pathText}: ${issue.message}`;
    })
    .join("; ");

const fileResults: FileResult[] = [];
const fileResultsByEntity: Partial<Record<EntityKey, FileResult[]>> = {};
const entityData: { [K in EntityKey]?: EntityDataset<any> } = {};
let failureCount = 0;

const pushFileResult = (result: FileResult): void => {
  fileResults.push(result);
  if (result.entity) {
    const existing = fileResultsByEntity[result.entity];
    if (existing) {
      existing.push(result);
    } else {
      fileResultsByEntity[result.entity] = [result];
    }
  }
};

const noteFailure = (result?: FileResult, amount = 1): void => {
  if (amount <= 0) {
    return;
  }
  if (result) {
    result.failureCount += amount;
  }
  failureCount += amount;
};

const registerFailureForEntity = (entity: EntityKey, amount = 1): void => {
  const target = fileResultsByEntity[entity]?.[0];
  noteFailure(target, amount);
};

const ensureDataset = <T>(entity: EntityKey): EntityDataset<T> => {
  const existing = entityData[entity];
  if (existing) {
    return existing as EntityDataset<T>;
  }
  const created: EntityDataset<T> = { records: [], ids: new Set() };
  entityData[entity] = created;
  return created;
};

async function loadEntityData(): Promise<void> {
  const loaders = Object.values(schemaConfigs)
    .filter((config) => config.loader)
    .map((config) => ({ key: config.entity, loader: config.loader! }));

  for (const { key, loader } of loaders) {
    const records = await loader();
    const dataset = ensureDataset<any>(key);
    const items = Array.isArray(records) ? records : [records];
    dataset.records.push(...items);
    for (const record of items) {
      const id = (record as { id?: unknown }).id;
      if (typeof id === "string" && id.trim()) {
        dataset.ids.add(id);
      }
    }
  }
}

async function main(): Promise<void> {
  await loadEntityData();

  const mockFiles = [
    "cases.json",
    "eligibilities.json",
    "policies.json",
    "pricingBands.json",
    "products.json",
    "proposals.json",
    "provenance.json",
    "renewals.json",
    "riders.json",
  ];

  for (const file of mockFiles) {
    const config = schemaConfigs[file];
    const baseResult: FileResult = {
      file,
      entity: config ? config.entity : null,
      count: 0,
      zodOk: false,
      zodIssueCount: 0,
      zodMessages: [],
      idsUnique: config ? true : null,
      duplicateIds: [],
      missingIds: [],
      fkStatus: "FAIL",
      notes: [],
      failureCount: 0,
    };

    const recordBaseFailure = (amount = 1): void => {
      if (amount <= 0) {
        return;
      }
      noteFailure(baseResult, amount);
    };

    if (!config) {
      baseResult.notes.push("No schema configured");
      pushFileResult(baseResult);
      recordBaseFailure();
      continue;
    }

    const filePath = `../src/mocks/${file}`;
    let parsed: unknown;

    try {
      if (config.loader) {
        const data = await config.loader();
        parsed = data;
      } else {
        const module = (await import(filePath, { assert: { type: "json" } })) as {
          default: unknown;
        };
        parsed = module.default;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      baseResult.notes.push(`Failed to load JSON: ${message}`);
      pushFileResult(baseResult);
      recordBaseFailure();
      continue;
    }

    if (config.expectsArray) {
      if (!Array.isArray(parsed)) {
        baseResult.notes.push("Expected an array, but got a different type");
        recordBaseFailure();
        pushFileResult(baseResult);
        continue;
      }
    }

    const validationResult = config.schema.safeParse(parsed);

    if (validationResult.success) {
      baseResult.zodOk = true;
      const records = Array.isArray(parsed) ? parsed : [parsed];
      baseResult.count = records.length;

      const ids = new Set<string>();
      const duplicateIds: string[] = [];
      const missingIds: number[] = [];
      records.forEach((record: { id?: unknown }, index: number) => {
        if (record.id && typeof record.id === "string") {
          if (ids.has(record.id)) {
            duplicateIds.push(record.id);
          }
          ids.add(record.id);
        } else {
          missingIds.push(index);
        }
      });

      if (duplicateIds.length > 0) {
        baseResult.idsUnique = false;
        baseResult.duplicateIds = duplicateIds;
        noteFailure(baseResult, duplicateIds.length);
      }
      if (missingIds.length > 0) {
        baseResult.idsUnique = false;
        baseResult.missingIds = missingIds;
        noteFailure(baseResult, missingIds.length);
      }
    } else {
      baseResult.zodOk = false;
      baseResult.zodMessages = [formatIssues(validationResult.error)];
      baseResult.zodIssueCount = validationResult.error.issues.length;
      noteFailure(baseResult, validationResult.error.issues.length);
    }

    pushFileResult(baseResult);
  }

  const relationshipDefinitions: RelationshipDefinition[] = [
    {
      description: "policies.productId -> products.id",
      source: "policies",
      target: "products",
      field: "productId",
      kind: "single",
      optional: true,
    },
    {
      description: "policies.riders[] -> riders.id",
      source: "policies",
      target: "riders",
      field: "riders",
      kind: "array",
    },
    {
      description: "products.availableRiderIds[] -> riders.id",
      source: "products",
      target: "riders",
      field: "availableRiderIds",
      kind: "array",
      optional: true,
    },
    {
      description: "riders.compatibleProductIds[] -> products.id",
      source: "riders",
      target: "products",
      field: "compatibleProductIds",
      kind: "array",
      optional: true,
    },
    {
      description: "pricingBands.productId -> products.id",
      source: "pricingBands",
      target: "products",
      field: "productId",
      kind: "single",
    },
    {
      description: "eligibilities.productId -> products.id",
      source: "eligibilities",
      target: "products",
      field: "productId",
      kind: "single",
    },
    {
      description: "cases.policyIds[] -> policies.id",
      source: "cases",
      target: "policies",
      field: "policyIds",
      kind: "array",
      optional: true,
    },
    {
      description: "proposals.caseId -> cases.id",
      source: "proposals",
      target: "cases",
      field: "caseId",
      kind: "single",
    },
    {
      description: "provenance.entityId -> typed entity id",
      source: "provenance",
      field: "entityId",
      typeField: "entityType",
      kind: "polymorphic",
      polymorphicTargets: {
        product: "products",
        policy: "policies",
        rider: "riders",
        case: "cases",
        proposal: "proposals",
      },
    },
  ];

  const relationshipOutcomes: RelationshipOutcome[] = [];

  const getRecordId = (record: unknown): string => {
    const value = (record as { id?: unknown })?.id;
    return typeof value === "string" && value.trim() ? value : "<unknown>";
  };

  for (const rel of relationshipDefinitions) {
    const sourceDataset = entityData[rel.source];
    if (!sourceDataset) {
      relationshipOutcomes.push({
        description: rel.description,
        source: rel.source,
        status: "SKIP",
        details: "source data unavailable",
      });
      continue;
    }

    if (rel.kind === "polymorphic") {
      const polymorphicRel = rel;
      const missingDetails: string[] = [];
      let total = 0;
      let resolved = 0;

      for (const record of sourceDataset.records) {
        const recordObj = record as Record<string, unknown>;
        const entityType = recordObj[polymorphicRel.typeField];
        const referencedId = recordObj[polymorphicRel.field];

        if (typeof referencedId !== "string" || !referencedId.trim()) {
          missingDetails.push(`${getRecordId(record)}:invalid-id`);
          continue;
        }

        total += 1;

        if (typeof entityType !== "string") {
          missingDetails.push(`${getRecordId(record)}:${referencedId} (unknown type)`);
          continue;
        }

        const targetEntity = polymorphicRel.polymorphicTargets[entityType];
        if (!targetEntity) {
          missingDetails.push(`${getRecordId(record)}:${referencedId} (unsupported type ${entityType})`);
          continue;
        }

        const targetDataset = entityData[targetEntity];
        if (!targetDataset) {
          missingDetails.push(`${getRecordId(record)}:${referencedId} (missing target data)`);
          continue;
        }

        if (targetDataset.ids.has(referencedId)) {
          resolved += 1;
        } else {
          missingDetails.push(`${getRecordId(record)}:${referencedId}`);
        }
      }

      const status = missingDetails.length === 0 ? "PASS" : "FAIL";
      relationshipOutcomes.push({
        description: rel.description,
        source: rel.source,
        status,
        resolved,
        total,
        missingDetails,
      });

      const percentage = total > 0 ? Math.round((resolved / total) * 100) : 100;
      const missingSummary =
        missingDetails.length > 0
          ? ` missing ${missingDetails.slice(0, 5).join(", ")}${
              missingDetails.length > 5 ? ` +${missingDetails.length - 5} more` : ""
            }`
          : "";
      console.log(
        `FK ${rel.description}: ${status} ${percentage}% (${resolved}/${total})${missingSummary}`
      );
      if (status === "FAIL") {
        registerFailureForEntity(rel.source, missingDetails.length || 1);
      }
      continue;
    }

    const targetDataset = entityData[rel.target];
    if (!targetDataset) {
      relationshipOutcomes.push({
        description: rel.description,
        source: rel.source,
        status: "FAIL",
        resolved: 0,
        total: 0,
        missingDetails: ["target data unavailable"],
      });
      console.log(`FK ${rel.description}: FAIL 0% (0/0) missing target data`);
      registerFailureForEntity(rel.source);
      continue;
    }

    const missingDetails: string[] = [];
    let totalRefs = 0;
    let resolvedRefs = 0;

    for (const record of sourceDataset.records) {
      const recordObj = record as Record<string, unknown>;
      const recordId = getRecordId(record);
      const value = recordObj[rel.field];

      if (value === undefined || value === null) {
        if (rel.optional) {
          continue;
        }
        missingDetails.push(`${recordId}:<empty>`);
        continue;
      }

      if (rel.kind === "single") {
        totalRefs += 1;
        if (typeof value === "string" && entityData[rel.target]?.ids.has(value)) {
          resolvedRefs += 1;
        } else if (typeof value === "string" && !entityData[rel.target]?.ids.has(value)) {
          missingDetails.push(`${recordId}:${value}`);
        } else {
          missingDetails.push(`${recordId}:invalid`);
        }
      } else if (rel.kind === "array") {
        if (!Array.isArray(value)) {
          missingDetails.push(`${recordId}:invalid-array`);
          continue;
        }
        const stringValues = value.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        );
        totalRefs += stringValues.length;
        for (const ref of stringValues) {
          if (entityData[rel.target]?.ids.has(ref)) {
            resolvedRefs += 1;
          } else {
            missingDetails.push(`${recordId}:${ref}`);
          }
        }
        if (stringValues.length !== value.length) {
          missingDetails.push(`${recordId}:non-string`);
        }
      }
    }

    const status = missingDetails.length === 0 ? "PASS" : "FAIL";
    relationshipOutcomes.push({
      description: rel.description,
      source: rel.source,
      status,
      resolved: resolvedRefs,
      total: totalRefs,
      missingDetails,
    });

    const percentage = totalRefs > 0 ? Math.round((resolvedRefs / totalRefs) * 100) : 100;
    const missingSummary =
      missingDetails.length > 0
        ? ` missing ${missingDetails.slice(0, 5).join(", ")}${
            missingDetails.length > 5 ? ` +${missingDetails.length - 5} more` : ""
          }`
        : "";
    console.log(
      `FK ${rel.description}: ${status} ${percentage}% (${resolvedRefs}/${totalRefs})${missingSummary}`
    );
    if (status === "FAIL") {
      const failureAmount = missingDetails.length > 0 ? missingDetails.length : totalRefs || 1;
      registerFailureForEntity(rel.source, failureAmount);
    }
  }

  const policyDataset = entityData.policies as EntityDataset<PolicyParsed> | undefined;

  if (policyDataset) {
    const chronologyIssues: string[] = [];
    const amountIssues: string[] = [];

    for (const policy of policyDataset.records) {
      const policyId = policy.id ?? "<unknown>";
      if (policy.effectiveDate && policy.expirationDate) {
        const effectiveTime = Date.parse(policy.effectiveDate);
        const expirationTime = Date.parse(policy.expirationDate);
        if (!Number.isFinite(effectiveTime) || !Number.isFinite(expirationTime)) {
          chronologyIssues.push(`${policyId}:invalid-dates`);
        } else if (effectiveTime > expirationTime) {
          chronologyIssues.push(`${policyId}:${policy.effectiveDate}>${policy.expirationDate}`);
        }
      }

      if (policy.premium?.amountMinor != null && policy.premium.amountMinor < 0) {
        amountIssues.push(`${policyId}:premium`);
      }
      if (policy.deductible?.amountMinor != null && policy.deductible.amountMinor < 0) {
        amountIssues.push(`${policyId}:deductible`);
      }
    }

    if (chronologyIssues.length > 0) {
      console.log(
        `Policy chronology violations: ${chronologyIssues.slice(0, 5).join(", ")}${
          chronologyIssues.length > 5 ? ` +${chronologyIssues.length - 5} more` : ""
        }`
      );
      registerFailureForEntity("policies", chronologyIssues.length);
    }

    if (amountIssues.length > 0) {
      console.log(
        `Policy money rule violations: ${amountIssues.slice(0, 5).join(", ")}${
          amountIssues.length > 5 ? ` +${amountIssues.length - 5} more` : ""
        }`
      );
      registerFailureForEntity("policies", amountIssues.length);
    }
  }

  const fkStatusPerEntity: Partial<Record<EntityKey, "PASS" | "FAIL">> = {};

  for (const relOutcome of relationshipOutcomes) {
    if (relOutcome.status === "SKIP") {
      continue;
    }
    const current = fkStatusPerEntity[relOutcome.source];
    if (relOutcome.status === "FAIL" || current === "FAIL") {
      fkStatusPerEntity[relOutcome.source] = "FAIL";
    } else if (!current) {
      fkStatusPerEntity[relOutcome.source] = "PASS";
    }
  }

  for (const fileResult of fileResults) {
    if (!fileResult.entity) {
      fileResult.fkStatus = "FAIL";
      continue;
    }

    if (!fileResult.zodOk) {
      fileResult.fkStatus = "FAIL";
      continue;
    }

    const fkStatus = fkStatusPerEntity[fileResult.entity];
    if (!fkStatus) {
      fileResult.fkStatus = "PASS";
    } else {
      fileResult.fkStatus = fkStatus;
    }
  }

  const header = ["name", "count", "zod", "idsUnique", "fk", "failures"];
  const rows = fileResults.map((result) => {
    const zodCell = result.zodOk
      ? "OK"
      : result.zodMessages.length > 0
      ? `ERR (${result.zodIssueCount || result.zodMessages.length})`
      : result.notes.length > 0
      ? "ERR (1)"
      : "ERR (0)";

    const idsUniqueCell =
      result.idsUnique === null ? "N/A" : result.idsUnique ? "YES" : "NO";

    return [
      result.file,
      String(result.count),
      zodCell,
      idsUniqueCell,
      result.fkStatus,
      result.failureCount > 0 ? String(result.failureCount) : "0",
    ];
  });

  const columnWidths = header.map((column, index) =>
    rows.reduce((width, row) => Math.max(width, (row[index] ?? "").length), column.length)
  );

  const formatRow = (row: string[]): string =>
    row
      .map((cell, index) => {
        const width = columnWidths[index] ?? header[index]?.length ?? cell.length;
        return cell.padEnd(width, " ");
      })
      .join(" | ");

  console.log("\nSummary");
  console.log(formatRow(header));
  console.log(
    columnWidths
      .map((width) => "-".repeat(width))
      .join("-+-")
  );
  rows.forEach((row) => {
    console.log(formatRow(row));
  });

  const totalFiles = fileResults.length;
  const failedFiles = fileResults.filter((result) => result.failureCount > 0).length;
  const totalRecords = fileResults.reduce((sum, result) => sum + result.count, 0);
  const totalFailures = fileResults.reduce((sum, result) => sum + result.failureCount, 0);

  console.log(
    `Totals: files=${totalFiles} records=${totalRecords} failures=${totalFailures} failedFiles=${failedFiles}`
  );
  console.log(`Result: ${failureCount > 0 ? "FAIL" : "PASS"}`);

  for (const result of fileResults) {
    if (result.zodMessages.length > 0) {
      console.log(`Zod issues in mocks/${result.file}: ${result.zodMessages.join("; ")}`);
    }
    if (result.notes.length > 0) {
      console.log(`Notes for mocks/${result.file}: ${result.notes.join("; ")}`);
    }
    if (result.duplicateIds.length > 0) {
      console.log(`Duplicate IDs detail ${result.file}: ${result.duplicateIds.join(", ")}`);
    }
    if (result.missingIds.length > 0) {
      console.log(`Missing ID indexes ${result.file}: ${result.missingIds.join(", ")}`);
    }
  }

  if (failureCount > 0) {
    process.exitCode = 1;
    process.exit(1);
  } else {
    process.exitCode = 0;
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("An unexpected error occurred:", error);
  process.exit(1);
});
