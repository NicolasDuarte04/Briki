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

/**
 * Load renewals from API for a specific case
 * Transforms API response to legacy RenewalRecord format for UI compatibility
 */
export async function loadRenewals(caseId?: string): Promise<RenewalRecord[]> {
  if (!caseId) {
    // Return empty array if no caseId - UI will call with caseId when ready
    return [];
  }
  
  try {
    const response = await fetch(`/api/renewals?caseId=${caseId}`);
    
    if (!response.ok) {
      console.error('Error loading renewals:', response.statusText);
      return [];
    }
    
    const data = await response.json();
    const renewals = data.renewals || [];
    
    // Transform API response to legacy RenewalRecord format
    return renewals.map((r: any) => ({
      id: r.id,
      carrier: r.carrier,
      plan: r.planName,
      renewalDateISO: r.renewalDate,
      premium: {
        amountMinor: r.currentPremiumMinor,
        currency: r.currency || 'COP',
      },
      status: r.renewalWindowStatus, // ok | dueSoon | overdue
      reminderSet: r.reminderSet || false,
      policyId: r.policyAnalysisId || undefined,
    }));
  } catch (error) {
    console.error('Error fetching renewals:', error);
    return [];
  }
}

/**
 * Create a new renewal
 */
export async function createRenewal(data: {
  caseId: string;
  carrier: string;
  planName: string;
  currentStartDate: string;
  currentEndDate: string;
  renewalDate: string;
  currentPremiumMinor: number;
  currency?: string;
  policyAnalysisId?: string;
  notes?: string;
}): Promise<any> {
  const response = await fetch('/api/renewals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create renewal');
  }
  
  return response.json();
}

/**
 * Update an existing renewal
 */
export async function updateRenewal(id: string, data: Partial<{
  carrier: string;
  planName: string;
  renewalDate: string;
  currentPremiumMinor: number;
  proposedPremiumMinor: number;
  status: string;
  reminderSet: boolean;
  reminderDate: string;
  notes: string;
}>): Promise<any> {
  const response = await fetch(`/api/renewals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update renewal');
  }
  
  return response.json();
}

/**
 * Delete a renewal
 */
export async function deleteRenewal(id: string): Promise<void> {
  const response = await fetch(`/api/renewals/${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete renewal');
  }
}

/**
 * Auto-detect renewals from policy analyses
 */
export async function detectRenewals(caseId: string, daysAhead: number = 90): Promise<any> {
  const response = await fetch('/api/renewals/detect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, daysAhead, skipExisting: true }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to detect renewals');
  }
  
  return response.json();
}

/**
 * Get renewal statistics
 */
export async function getRenewalStats(caseId?: string): Promise<any> {
  const url = caseId 
    ? `/api/renewals/stats?caseId=${caseId}` 
    : '/api/renewals/stats';
    
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get renewal stats');
  }
  
  return response.json();
}

/**
 * Set reminder for a renewal
 */
export async function setRenewalReminder(id: string, reminderSet: boolean, reminderDate?: string): Promise<any> {
  return updateRenewal(id, { 
    reminderSet, 
    reminderDate: reminderDate || undefined 
  });
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