/**
 * Workspace data queries - SSR optimized
 * 
 * PERFORMANCE NOTES:
 * - All queries use org_id scoping (relies on Supabase RLS)
 * - Recommended indexes listed in function TODOs
 * - Current v1: adapts cases table with stage filtering
 * 
 * MIGRATION PATH:
 * - v2: Replace with dedicated policies/proposals tables
 * - Types remain stable for UI compatibility
 */

import { createServerSupabase } from '@/lib/supabase/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Continue item for resuming work
 */
export interface ContinueItem {
  id: string;
  title: string;
  description: string;
  stage: string;
  updatedAt: string;
}

/**
 * Recent policy item (exact DTO)
 */
export interface RecentPolicy {
  id: string;
  title: string;
  client_name: string;
  status: string;
  updated_at: string;
  expire_at: string | null;
}

/**
 * Recent proposal item (exact DTO)
 */
export interface RecentProposal {
  id: string;
  title: string;
  client_name: string;
  status: string;
  updated_at: string;
}

/**
 * Renewal item with expiration date (exact DTO)
 */
export interface RenewalItem {
  id: string;
  title: string;
  client_name: string;
  status: string;
  updated_at: string;
  expire_at: string;
}

/**
 * Renewals grouped by time buckets
 */
export interface RenewalsBuckets {
  lt30: RenewalItem[];
  d30_60: RenewalItem[];
  d60_90: RenewalItem[];
}

/**
 * Inbox item (future implementation)
 */
export interface InboxItem {
  id: string;
  kind: string;
  payload: unknown;
  dueAt: string | null;
  createdAt: string;
}

/**
 * Pinned client (future implementation)
 */
export interface PinnedClient {
  id: string;
  clientId: string;
  clientName: string;
  createdAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Stage mappings for cases table v1 adapter
 */
const WORK_IN_PROGRESS_STAGES = ['initial', 'sourcing', 'analysis', 'proposal', 'negotiation'];
const POLICY_STAGES = ['policy_issued', 'closed'];
const PROPOSAL_STAGES = ['quoted', 'proposal'];

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Gets the most recent work-in-progress item for a user to continue
 * 
 * TODO: Future - join to activities table for proper tracking
 * 
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Most recent continue item or null
 */
export async function getContinueItem(
  userId: string,
  orgId: string
): Promise<ContinueItem | null> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('cases')
    .select('id, client_name, stage, status, updated_at')
    .eq('org_id', orgId)
    .in('stage', WORK_IN_PROGRESS_STAGES)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    title: data.client_name || 'Sin nombre',
    description: `${data.stage} • ${data.status}`,
    stage: data.stage,
    updatedAt: data.updated_at,
  };
}

/**
 * Gets recent policies for an organization
 * 
 * TODO: Recommended index: (org_id, stage, updated_at DESC)
 * TODO: RLS policy on cases table to enforce org_id scoping
 * 
 * @param orgId - Organization ID
 * @returns Array of recent policies (max 6)
 */
export async function getRecentPolicies(orgId: string): Promise<RecentPolicy[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('cases')
    .select('id, title, client_name, status, updated_at, expire_at')
    .eq('org_id', orgId)
    .in('stage', POLICY_STAGES)
    .neq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(6);

  if (error || !data) {
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    title: item.title ?? 'Póliza sin nombre',
    client_name: item.client_name ?? 'Sin nombre',
    status: item.status,
    updated_at: item.updated_at,
    expire_at: item.expire_at ?? null,
  }));
}

/**
 * Gets recent proposals for an organization
 * 
 * TODO: Recommended index: (org_id, stage, updated_at DESC)
 * TODO: RLS policy on cases table to enforce org_id scoping
 * 
 * @param orgId - Organization ID
 * @returns Array of recent proposals (max 6)
 */
export async function getRecentProposals(orgId: string): Promise<RecentProposal[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('cases')
    .select('id, title, client_name, status, updated_at')
    .eq('org_id', orgId)
    .in('stage', PROPOSAL_STAGES)
    .order('updated_at', { ascending: false })
    .limit(6);

  if (error || !data) {
    return [];
  }

  return data.map((item) => ({
    id: item.id,
    title: item.title ?? 'Póliza sin nombre',
    client_name: item.client_name ?? 'Sin nombre',
    status: item.status,
    updated_at: item.updated_at,
  }));
}

/**
 * Gets renewals grouped by time buckets based on expiration dates
 * 
 * Uses UTC boundaries to ensure consistent bucketing regardless of server timezone.
 * 
 * TODO: Add cases.expire_at as timestamptz column
 * TODO: Recommended index: (org_id, expire_at ASC)
 * TODO: RLS policy on cases table to enforce org_id scoping
 * 
 * @param orgId - Organization ID
 * @returns Renewals grouped into 3 time buckets
 */
export async function getRenewalsBuckets(orgId: string): Promise<RenewalsBuckets> {
  const supabase = await createServerSupabase();

  // Compute UTC date boundaries
  const now = new Date();
  const startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const addDaysUTC = (d: number) => new Date(startUTC.getTime() + d * 24 * 60 * 60 * 1000);
  const d30 = addDaysUTC(30);
  const d60 = addDaysUTC(60);
  const d90 = addDaysUTC(90);

  // Query cases with expire_at within the 90-day window
  const { data, error } = await supabase
    .from('cases')
    .select('id, title, client_name, status, updated_at, expire_at')
    .eq('org_id', orgId)
    .not('expire_at', 'is', null)
    .gte('expire_at', startUTC.toISOString())
    .lte('expire_at', d90.toISOString())
    .order('expire_at', { ascending: true });

  if (error || !data || data.length === 0) {
    return {
      lt30: [],
      d30_60: [],
      d60_90: [],
    };
  }

  // Initialize buckets
  const buckets: RenewalsBuckets = {
    lt30: [],
    d30_60: [],
    d60_90: [],
  };

  // Group items into buckets based on UTC boundaries
  for (const item of data) {
    if (!item.expire_at) continue;

    const expireAt = new Date(item.expire_at);
    if (isNaN(expireAt.getTime())) continue;

    const renewalItem: RenewalItem = {
      id: item.id,
      title: item.title ?? 'Póliza sin nombre',
      client_name: item.client_name ?? 'Sin nombre',
      status: item.status,
      updated_at: item.updated_at,
      expire_at: item.expire_at,
    };

    // Categorize into buckets using UTC boundaries
    if (expireAt < d30) {
      buckets.lt30.push(renewalItem);
    } else if (expireAt >= d30 && expireAt < d60) {
      buckets.d30_60.push(renewalItem);
    } else if (expireAt >= d60 && expireAt <= d90) {
      buckets.d60_90.push(renewalItem);
    }
  }

  return buckets;
}

/**
 * Gets inbox items for a user (actionable notifications/tasks)
 * 
 * TODO: Create inbox_items table:
 *       (id, user_id, org_id, kind, payload, due_at, created_at, completed_at)
 * TODO: Recommended index: (user_id, org_id, completed_at, due_at)
 * 
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Array of inbox items (empty in v1)
 */
export async function getInboxItems(
  userId: string,
  orgId: string
): Promise<InboxItem[]> {
  // v1: Return empty array until inbox_items table is created
  return [];
}

/**
 * Gets pinned clients for a user
 * 
 * TODO: Create pins table:
 *       (user_id, org_id, client_id, created_at)
 * TODO: Recommended index: (user_id, org_id, created_at DESC)
 * 
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Array of pinned clients (max 10, empty in v1)
 */
export async function getPinnedClients(
  userId: string,
  orgId: string
): Promise<PinnedClient[]> {
  // v1: Return empty array until pins table is created
  // When implemented, limit to 10 results
  return [];
}


/**
 * Gets the ID of the most recently updated agent thread for an organization.
 *
 * @param userId - User ID (for RLS and future ownership checks)
 * @param orgId - Organization ID
 * @returns The ID of the latest thread or null if none exist.
 */
export async function getLatestAgentThreadId(
  userId: string,
  orgId: string
): Promise<string | null> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('cases')
    .select('id')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // This is an expected case when a user has no threads, not an error.
    return null;
  }

  return data.id;
}

/**
 * Creates a new draft agent thread (Case) for an organization.
 *
 * This serves as the starting point when a user initiates a new conversation
 * with the agent and no previous threads exist.
 *
 * @param userId - User ID of the creator
 * @param orgId - Organization ID
 * @returns The newly created case object.
 * @throws If the case creation fails in Supabase.
 */
export async function createAgentThreadDraft(
  userId: string,
  orgId: string
): Promise<{ id: string }> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('cases')
    .insert({
      org_id: orgId,
      status: 'draft',
      stage: 'initial',
      client_name: 'Nuevo Caso de Agente', // Default title
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Failed to create agent thread draft:', error);
    throw new Error('Could not create a new agent thread draft.');
  }

  return data;
}

