# Phase 3 Mocks Proof

## Fixture Snapshot (2025-09-29)

| File | Records | MD5 (first 8) | Last Updated |
| --- | ---: | --- | --- |
| `src/mocks/cases.json` | 1 | `f531a33b` | 2025-09-29 10:34:04 -0500 |
| `src/mocks/eligibilities.json` | 36 | `56582caf` | 2025-09-29 09:38:03 -0500 |
| `src/mocks/policies.json` | 14 | `7b9f4808` | 2025-09-29 10:33:50 -0500 |
| `src/mocks/pricingBands.json` | 6 | `db35e35f` | 2025-09-29 09:40:08 -0500 |
| `src/mocks/products.json` | 6 | `802fb78b` | 2025-09-29 10:33:57 -0500 |
| `src/mocks/proposals.json` | 2 | `688b6b08` | 2025-09-29 10:34:11 -0500 |
| `src/mocks/provenance.json` | 8 | `0d89b931` | 2025-09-29 10:34:01 -0500 |
| `src/mocks/riders.json` | 15 | `813ab564` | 2025-09-29 10:33:47 -0500 |

## Validation Summary

```
FK policies.productId -> products.id: PASS 100% (14/14)
FK policies.riders[] -> riders.id: PASS 100% (16/16)
FK products.availableRiderIds[] -> riders.id: PASS 100% (7/7)
FK riders.compatibleProductIds[] -> products.id: FAIL 0% (0/8) missing rdr_virtual_care:prd_health_connect, rdr_virtual_care:prd_benefits_combo, rdr_dental_implants:prd_dental_plus, rdr_vision_focus:prd_vision_focus, rdr_life_accidental:prd_life_secure +3 more
FK pricingBands.productId -> products.id: PASS 100% (6/6)
FK eligibilities.productId -> products.id: PASS 100% (36/36)
FK cases.policyIds[] -> policies.id: PASS 100% (4/4)
FK proposals.caseId -> cases.id: PASS 100% (2/2)
FK provenance.entityId -> typed entity id: PASS 100% (8/8)

Summary
name               | count | zod | idsUnique | fk  
-------------------+-------+-----+-----------+-----
cases.json         | 1     | OK  | YES       | PASS
eligibilities.json | 36    | OK  | YES       | PASS
policies.json      | 14    | OK  | YES       | PASS
pricingBands.json  | 6     | OK  | YES       | PASS
products.json      | 6     | OK  | YES       | PASS
proposals.json     | 2     | OK  | YES       | PASS
provenance.json    | 8     | OK  | YES       | PASS
riders.json        | 15    | OK  | YES       | FAIL
```

## Edge Case Coverage Notes

- **No riders:** `pol_viva_salud_lite_legacy` (expired), `pol_escudo_pyme_salud_mar2025` (active) validate riderless handling.
- **Expired policy:** `pol_viva_salud_lite_legacy` (ended 2024-06-30) exercises historical display.
- **Inactive product:** `prod_viva_salud_lite` confirms front-end guards.
- **Currency variety:** `prod_harmonia_familia_mx` uses MXN and cross-border pricing bands.
- **Suspended/cancelled states:** `pol_flex_familia_latam_cancelled` and `pol_globalcare_enterprise_suspended` cover non-active statuses.

