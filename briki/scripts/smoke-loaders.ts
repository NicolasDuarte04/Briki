#!/usr/bin/env tsx

type LoaderTask = {
  name: string;
  loader: () => Promise<unknown[]>;
  mockPath: string;
};

async function main(): Promise<void> {
  const fx = await import("../src/lib/fx");

  const useMocks = fx.getUseMocks();
  const contextLabel = useMocks ? "mocks:on" : "mocks:off";

  const tasks: LoaderTask[] = [
    { name: "loadPolicies", loader: fx.loadPolicies, mockPath: "src/mocks/policies.json" },
    { name: "loadProducts", loader: fx.loadProducts, mockPath: "src/mocks/products.json" },
    { name: "loadRiders", loader: fx.loadRiders, mockPath: "src/mocks/riders.json" },
    { name: "loadPricingBands", loader: fx.loadPricingBands, mockPath: "src/mocks/pricingBands.json" },
    { name: "loadEligibilities", loader: fx.loadEligibilities, mockPath: "src/mocks/eligibilities.json" },
    { name: "loadProvenance", loader: fx.loadProvenance, mockPath: "src/mocks/provenance.json" },
    { name: "loadCases", loader: fx.loadCases, mockPath: "src/mocks/cases.json" },
    { name: "loadProposals", loader: fx.loadProposals, mockPath: "src/mocks/proposals.json" },
    { name: "loadRenewals", loader: fx.loadRenewals, mockPath: "src/mocks/renewals.json" },
  ];

  console.log(`smoke-loaders | ${contextLabel}`);

  for (const task of tasks) {
    try {
      const result = await task.loader();

      if (!Array.isArray(result)) {
        console.error(`${task.name} | non-array response | ${task.mockPath} (${contextLabel})`);
        continue;
      }

      const count = result.length;
      const locationLabel = useMocks ? task.mockPath : "live";

      console.log(`${task.name} | ${count} | ${locationLabel} (${contextLabel})`);
    } catch (error) {
      console.error(`${task.name} | threw | ${task.mockPath} (${contextLabel})`);
      console.error(error);
    }
  }
}

main().catch((error) => {
  console.error("smoke-loaders | unexpected error", error);
});

