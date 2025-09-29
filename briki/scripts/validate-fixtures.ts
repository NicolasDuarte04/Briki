import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

import {
  CaseSchema,
  MoneySchema,
  PolicySchema,
  ProductSchema,
  ProposalSchema,
  RenewalRecordSchema,
} from "../src/lib/validation";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Fixture = {
  entity: string;
  schema: z.ZodTypeAny;
  data: unknown;
};

const fixtures: Fixture[] = [
  {
    entity: "Money",
    schema: MoneySchema,
    data: { amountMinor: 12500, currency: "USD" },
  },
  {
    entity: "Money",
    schema: MoneySchema,
    data: { amountMinor: -1, currency: "USD" },
  },
  {
    entity: "Policy",
    schema: PolicySchema,
    data: {
      id: "pol-001",
      plan: "Standard Health",
      policyNumber: "POL123456",
      productId: "prod-001",
      carrierId: "car-001",
      premium: { amountMinor: 45000, currency: "USD" },
      deductible: { amountMinor: 100000, currency: "USD" },
      riders: ["rider-001"],
      network: "preferred",
      service: "enhanced",
      status: "active",
      effectiveDate: "2024-01-01T00:00:00.000Z",
      expirationDate: "2024-12-31T23:59:59.000Z",
      renewalDate: "2025-01-01T00:00:00.000Z",
    },
  },
  {
    entity: "Policy",
    schema: PolicySchema,
    data: {
      id: "pol-err",
      plan: "Broken Policy",
      premium: { amountMinor: 45000, currency: "INVALID" },
      deductible: { amountMinor: 100000, currency: "USD" },
      riders: ["rider-001"],
      effectiveDate: "2024-01-01", // missing offset
    },
  },
  {
    entity: "Product",
    schema: ProductSchema,
    data: {
      id: "prod-001",
      name: "Comprehensive Health",
      code: "PROD-001",
      carrierId: "car-001",
      coverageKind: "group",
      availableRiderIds: ["rider-001"],
      basePremiumRange: {
        min: { amountMinor: 30000, currency: "USD" },
        max: { amountMinor: 60000, currency: "USD" },
      },
      metadata: { tier: "gold" },
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    },
  },
  {
    entity: "Product",
    schema: ProductSchema,
    data: {
      id: "prod-err",
      name: "Invalid Coverage",
      code: "PROD-ERR",
      carrierId: "car-001",
      coverageKind: "unknown",
      availableRiderIds: [],
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "invalid-date",
    },
  },
  {
    entity: "Case",
    schema: CaseSchema,
    data: {
      id: "case-001",
      referenceNumber: "CASE-2024-01",
      brief: {
        businessType: "Technology",
        employees: 150,
        coverage: "Complete",
        freeText: "Priority client",
      },
      brokerId: "broker-001",
      customer: {
        name: "Acme Corp",
        email: "contact@acme.com",
        phone: "+1234567890",
        companyName: "Acme Corporation",
      },
      status: "new",
      channel: "broker",
      policyIds: ["pol-001"],
      quoteIds: ["quote-001"],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    },
  },
  {
    entity: "Case",
    schema: CaseSchema,
    data: {
      id: "case-err",
      referenceNumber: "CASE-ERR",
      brief: {},
      status: "invalid-status",
      channel: "broker",
      policyIds: [],
      quoteIds: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    },
  },
  {
    entity: "Proposal",
    schema: ProposalSchema,
    data: {
      id: "prop-001",
      caseId: "case-001",
      broker: {
        name: "Jane Broker",
        agency: "Trusted Advisors",
        email: "jane@advisors.com",
        phone: "+10987654321",
        brandColor: "#3366FF",
        logoUrl: "https://example.com/logo.png",
      },
      brief: {
        businessType: "Technology",
        employees: 150,
        coverage: "Complete",
        freeText: "Priority client",
      },
      selectedPlans: [
        {
          planId: "plan-001",
          rationaleKey: "best_fit",
        },
      ],
      disclosuresKeys: ["disclosure-001"],
      mathCheck: {
        passed: true,
        messageKey: "math_ok",
      },
      shareUrl: "https://example.com/proposal/prop-001",
      generatedOn: "2024-01-02T12:00:00.000Z",
      metadata: { preparedBy: "Jane" },
    },
  },
  {
    entity: "Proposal",
    schema: ProposalSchema,
    data: {
      id: "prop-err",
      caseId: "case-001",
      broker: {
        name: "Jane Broker",
        agency: "Trusted Advisors",
        brandColor: "#3366FF",
      },
      brief: {},
      selectedPlans: [],
      disclosuresKeys: ["disclosure-001"],
      mathCheck: {
        passed: true,
        messageKey: "math_ok",
      },
      shareUrl: "https://example.com/proposal/prop-001",
      generatedOn: "2024-01-02", // missing time zone
    },
  },
  {
    entity: "RenewalRecord",
    schema: RenewalRecordSchema,
    data: {
      id: "ren-001",
      carrier: "HealthCo",
      plan: "Premium Plan",
      renewalDateISO: "2024-06-01T00:00:00.000Z",
      premium: { amountMinor: 50000, currency: "USD" },
      status: "ok",
      reminderSet: true,
      policyId: "pol-001",
    },
  },
  {
    entity: "RenewalRecord",
    schema: RenewalRecordSchema,
    data: {
      id: "ren-err",
      carrier: "HealthCo",
      plan: "Premium Plan",
      renewalDateISO: "not-a-date",
      premium: { amountMinor: 50000, currency: "USD" },
      status: "overdue",
      reminderSet: "yes",
    },
  },
];

const formatIssues = (error: z.ZodError<unknown>): string =>
  error.issues
    .map((issue) => {
      const pathText = issue.path.length ? issue.path.join(".") : "<root>";
      return `${pathText}: ${issue.message}`;
    })
    .join("; ");

for (const { entity, schema, data } of fixtures) {
  const result = schema.safeParse(data);
  if (result.success) {
    console.log(`OK: ${entity}`);
  } else {
    console.log(`ERR: ${entity} - ${formatIssues(result.error)}`);
  }
}

const mockSchemaMap: Record<string, z.ZodTypeAny> = {
  "policies.json": z.array(PolicySchema),
  "products.json": z.array(ProductSchema),
  "cases.json": z.array(CaseSchema),
  "proposals.json": z.array(ProposalSchema),
  "renewals.json": z.array(RenewalRecordSchema),
};

const mocksDir = path.resolve(__dirname, "../src/mocks");

try {
  const mockFiles = readdirSync(mocksDir).filter((file) => file.endsWith(".json"));
  for (const file of mockFiles) {
    const schema = mockSchemaMap[file];
    if (!schema) {
      continue;
    }

    const filePath = path.join(mocksDir, file);

    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      const isArray = Array.isArray(parsed);
      const sampleSize = isArray ? Math.min(parsed.length, 3) : 1;

      if (isArray && parsed.length === 0) {
        console.log(`ERR: mocks/${file} - file has no data`);
        continue;
      }

      const sample = isArray ? parsed.slice(0, sampleSize) : parsed;
      const result = schema.safeParse(sample);

      if (result.success) {
        const totalCount = isArray ? parsed.length : 1;
        console.log(`OK: mocks/${file} (${sampleSize}/${totalCount})`);
      } else {
        console.log(`ERR: mocks/${file} - ${formatIssues(result.error)}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`ERR: mocks/${file} - ${message}`);
    }
  }
} catch (error) {
  // Directory missing or unreadable: no mocks to validate.
}

process.exitCode = 0;

