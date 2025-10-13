import { z } from "zod";
import {
  CaseSchema,
  EligibilitySchema,
  PolicySchema,
  PricingBandSchema,
  ProductSchema,
  ProvenanceSchema,
  RenewalRecordSchema,
  RiderSchema,
} from "./validation";
import type {
  Case,
  Eligibility,
  Policy,
  PricingBand,
  Product,
  Provenance,
  RenewalRecord,
  Rider,
} from "./types";

const DELAY_MS = 150;

// Helper function to simulate network delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadPolicies(): Promise<Policy[]> {
  await sleep(DELAY_MS);
  const mockData: Policy[] = [];
  return z.array(PolicySchema).parse(mockData);
}

export async function loadProducts(): Promise<Product[]> {
  await sleep(DELAY_MS);
  const mockData: Product[] = [];
  return z.array(ProductSchema).parse(mockData);
}

export async function loadRiders(): Promise<Rider[]> {
  await sleep(DELAY_MS);
  const mockData: Rider[] = [];
  return z.array(RiderSchema).parse(mockData);
}

export async function loadPricingBands(): Promise<PricingBand[]> {
  await sleep(DELAY_MS);
  const mockData: PricingBand[] = [];
  return z.array(PricingBandSchema).parse(mockData);
}

export async function loadEligibilities(): Promise<Eligibility[]> {
  await sleep(DELAY_MS);
  const mockData: Eligibility[] = [];
  return z.array(EligibilitySchema).parse(mockData);
}

export async function loadProvenance(): Promise<Provenance[]> {
  await sleep(DELAY_MS);
  const mockData: Provenance[] = [];
  return z.array(ProvenanceSchema).parse(mockData);
}

export async function loadCases(): Promise<Case[]> {
  await sleep(DELAY_MS);
  const mockData: Case[] = [];
  return z.array(CaseSchema).parse(mockData);
}

export async function loadRenewals(): Promise<RenewalRecord[]> {
  await sleep(DELAY_MS);
  const mockData: RenewalRecord[] = [];
  return z.array(RenewalRecordSchema).parse(mockData);
}

// Mock implementation for sendViaEmail
export async function sendViaEmail(payload: unknown): Promise<{ success: true }> {
  await sleep(DELAY_MS);
  // eslint-disable-next-line no-console
  console.log("Mock sending email with payload:", payload);
  return { success: true };
}

// Mock implementation for sendViaWhatsApp
export async function sendViaWhatsApp(payload: unknown): Promise<{ success: true }> {
  await sleep(DELAY_MS);
  // eslint-disable-next-line no-console
  console.log("Mock sending WhatsApp with payload:", payload);
  return { success: true };
}
