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
import { prisma } from '@/lib/prisma';
import { ORG_POLICIES_CONTAINER } from '@/lib/helpers/getOrgPoliciesContainer';
import { ORG_QUOTES_CONTAINER } from '@/lib/helpers/getOrgQuotesContainer';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Continue item for resuming work
 */
export interface ContinueItem {
  id: string;
  title: string;
  clientName: string; // ✅ Nombre del cliente separado del título del caso
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
 * Recent case item (exact DTO)
 */
export interface RecentCase {
  id: string;
  title: string;
  client_name: string;
  status: string;
  updated_at: string;
}

/**
 * Pinned case (future implementation)
 */
export interface PinnedCase {
  id: string;
  caseId: string;
  caseName: string;
  clientName: string;
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

/**
 * Pinned policy (future implementation)
 */
export interface PinnedPolicy {
  id: string;
  policyId: string;
  policyName: string;
  clientName: string;
  createdAt: string;
}

/**
 * User pins structure stored in user_preferences.ui_preferences
 */
export interface UserPins {
  cases: string[];
  clients: string[];
  policies: string[];
  companies: string[];
  quotes: string[];
}

/**
 * Entity types that can be pinned
 */
export type PinnableEntityType = 'case' | 'client' | 'policy' | 'company' | 'quote';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Maximum number of pins per entity type
 */
const MAX_PINS_PER_TYPE = 10;

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
    .select('id, case_name, client_name, stage, status, updated_at')
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
    title: data.case_name || data.client_name || 'Caso sin nombre', // ✅ Priorizar case_name
    clientName: data.client_name || 'Sin cliente', // ✅ Campo separado para cliente
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
 * Gets recent cases for an organization (all stages)
 * 
 * Unlike getRecentPolicies/getRecentProposals which filter by stage,
 * this returns the most recent cases regardless of their stage.
 * 
 * @param orgId - Organization ID
 * @returns Array of recent cases (max 3)
 */
export async function getRecentCases(orgId: string): Promise<RecentCase[]> {
  const supabase = await createServerSupabase();

  // Obtener más registros para compensar el filtrado posterior
  const { data, error } = await supabase
    .from('cases')
    .select('id, case_name, client_name, status, stage, updated_at')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error || !data) {
    console.error('[getRecentCases] Error:', error);
    return [];
  }

  // ✅ Filtrar en JavaScript: excluir los casos contenedores de organización
  // El campo 'status' contiene '__org_policies_container__' o '__org_quotes_container__' para casos especiales
  const filteredData = data.filter(item => 
    item.status !== ORG_POLICIES_CONTAINER.STATUS &&
    item.status !== ORG_QUOTES_CONTAINER.STATUS
  );

  // Limitar a 3 resultados después del filtrado
  return filteredData.slice(0, 3).map((item) => ({
    id: item.id,
    title: item.case_name ?? item.client_name ?? 'Caso sin nombre', // ✅ Priorizar case_name
    client_name: item.client_name ?? 'Sin cliente', // ✅ Nombre del cliente separado
    status: item.status,
    updated_at: item.updated_at,
  }));
}

/**
 * Gets recent organizational policies (standalone policies from the virtual container)
 * 
 * This queries PolicyAnalysis records from the org's policy container,
 * not cases with policy stages. These are the policies uploaded to /policies/analysis.
 * 
 * @param orgId - Organization ID
 * @returns Array of recent policies (max 3)
 */
export async function getRecentOrgPolicies(orgId: string): Promise<RecentPolicy[]> {
  try {
    // Get policies from the organization's container
    const policies = await prisma.policyAnalysis.findMany({
      where: {
        orgId: orgId,
        case: {
          status: ORG_POLICIES_CONTAINER.STATUS,
          stage: ORG_POLICIES_CONTAINER.STAGE,
        },
      },
      include: {
        artifact: {
          select: { fileName: true },
        },
      },
      orderBy: { extractedAt: 'desc' },
      take: 3,
    });

    return policies.map((policy) => {
      const extractedData = policy.extractedData as Record<string, unknown> | null;
      
      // Extract readable name from extracted data
      const policyNumber = extractStringField(extractedData, 'policy_number');
      const insurer = extractStringField(extractedData, 'insurer');
      const insuredName = extractStringField(extractedData, 'insured_name') || 
                          extractStringField(extractedData, 'policyholder');
      const endDate = extractStringField(extractedData, 'end_date') || 
                      extractStringField(extractedData, 'expiry_date');
      
      // Build title: prefer "Insurer #Number" or filename
      let title = policy.artifact?.fileName || 'Póliza sin nombre';
      if (insurer && policyNumber) {
        title = `${insurer} #${policyNumber}`;
      } else if (insurer) {
        title = insurer;
      } else if (policyNumber) {
        title = `Póliza #${policyNumber}`;
      }
      
      // Determine status based on confidence
      const confidence = Number(policy.overallConfidence);
      const status = confidence >= 0.8 ? 'analyzed' : 
                     confidence >= 0.5 ? 'partial' : 'pending';
      
      return {
        id: policy.id,
        title: title,
        client_name: insuredName || 'Sin asegurado',
        status: status,
        updated_at: policy.extractedAt.toISOString(),
        expire_at: endDate || null,
      };
    });
  } catch (error) {
    console.error('[getRecentOrgPolicies] Error:', error);
    return [];
  }
}

// ============================================================================
// PINS FUNCTIONS
// ============================================================================

/**
 * Gets user pins from user_preferences.ui_preferences
 * 
 * @param userId - User ID
 * @returns UserPins object with arrays of pinned entity IDs
 */
export async function getUserPins(userId: string): Promise<UserPins> {
  const supabase = await createServerSupabase();
  
  const { data, error } = await supabase
    .from('user_preferences')
    .select('ui_preferences')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) {
    console.error('[getUserPins] Error:', error);
    return { cases: [], clients: [], policies: [], companies: [], quotes: [] };
  }
  
  // Parse pins from ui_preferences JSONB
  const uiPrefs = data?.ui_preferences as Record<string, unknown> | null;
  const pins = uiPrefs?.pins as UserPins | undefined;
  
  return {
    cases: Array.isArray(pins?.cases) ? pins.cases : [],
    clients: Array.isArray(pins?.clients) ? pins.clients : [],
    policies: Array.isArray(pins?.policies) ? pins.policies : [],
    companies: Array.isArray(pins?.companies) ? pins.companies : [],
    quotes: Array.isArray(pins?.quotes) ? pins.quotes : [],
  };
}

/**
 * Toggles a pin for an entity (add if not pinned, remove if pinned)
 * 
 * @param userId - User ID
 * @param entityId - Entity ID to pin/unpin
 * @param entityType - Type of entity ('case' | 'client' | 'policy')
 * @returns Object with isPinned (new state) and success flag
 */
export async function togglePin(
  userId: string,
  entityId: string,
  entityType: PinnableEntityType
): Promise<{ isPinned: boolean; success: boolean; error?: string }> {
  const supabase = await createServerSupabase();
  
  try {
    // 1. Get current preferences
    const { data: existing, error: fetchError } = await supabase
      .from('user_preferences')
      .select('ui_preferences')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('[togglePin] Fetch error:', fetchError);
      return { isPinned: false, success: false, error: 'Error fetching preferences' };
    }
    
    // 2. Parse current pins
    const uiPrefs = (existing?.ui_preferences as Record<string, unknown>) || {};
    const currentPins = (uiPrefs.pins as UserPins) || { cases: [], clients: [], policies: [], companies: [], quotes: [] };
    
    // 3. Determine array key based on entity type
    const arrayKey = entityType === 'case' ? 'cases' : 
                     entityType === 'client' ? 'clients' : 
                     entityType === 'company' ? 'companies' :
                     entityType === 'quote' ? 'quotes' : 'policies';
    
    // 4. Get current array (ensure it's an array)
    const currentArray = Array.isArray(currentPins[arrayKey]) ? currentPins[arrayKey] : [];
    
    // 5. Toggle: add or remove
    const isCurrentlyPinned = currentArray.includes(entityId);
    let newArray: string[];
    
    if (isCurrentlyPinned) {
      // Remove from array
      newArray = currentArray.filter(id => id !== entityId);
    } else {
      // Check limit before adding
      if (currentArray.length >= MAX_PINS_PER_TYPE) {
        return { 
          isPinned: false, 
          success: false, 
          error: `Límite de ${MAX_PINS_PER_TYPE} elementos anclados alcanzado` 
        };
      }
      // Add to array
      newArray = [...currentArray, entityId];
    }
    
    // 6. Build updated pins object
    const updatedPins: UserPins = {
      ...currentPins,
      cases: arrayKey === 'cases' ? newArray : (currentPins.cases || []),
      clients: arrayKey === 'clients' ? newArray : (currentPins.clients || []),
      policies: arrayKey === 'policies' ? newArray : (currentPins.policies || []),
      companies: arrayKey === 'companies' ? newArray : (currentPins.companies || []),
      quotes: arrayKey === 'quotes' ? newArray : (currentPins.quotes || []),
    };
    
    // 7. Build updated ui_preferences
    const updatedUiPrefs = {
      ...uiPrefs,
      pins: updatedPins,
    };
    
    // 8. Upsert user_preferences
    const { error: upsertError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ui_preferences: updatedUiPrefs,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });
    
    if (upsertError) {
      console.error('[togglePin] Upsert error:', upsertError);
      return { isPinned: isCurrentlyPinned, success: false, error: 'Error saving pin' };
    }
    
    return { isPinned: !isCurrentlyPinned, success: true };
    
  } catch (error) {
    console.error('[togglePin] Unexpected error:', error);
    return { isPinned: false, success: false, error: 'Unexpected error' };
  }
}

/**
 * Checks if an entity is pinned by the user
 * 
 * @param userId - User ID
 * @param entityId - Entity ID to check
 * @param entityType - Type of entity
 * @returns boolean indicating if entity is pinned
 */
export async function isEntityPinned(
  userId: string,
  entityId: string,
  entityType: PinnableEntityType
): Promise<boolean> {
  const pins = await getUserPins(userId);
  const arrayKey = entityType === 'case' ? 'cases' : 
                   entityType === 'client' ? 'clients' : 
                   entityType === 'company' ? 'companies' : 'policies';
  return pins[arrayKey].includes(entityId);
}

/**
 * Gets pinned cases for a user with full case data
 * 
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Array of pinned cases (max 10)
 */
export async function getPinnedCases(
  userId: string,
  orgId: string
): Promise<PinnedCase[]> {
  const pins = await getUserPins(userId);
  
  if (pins.cases.length === 0) {
    return [];
  }
  
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from('cases')
    .select('id, case_name, client_name, status, updated_at')
    .in('id', pins.cases)
    .eq('org_id', orgId)
    .limit(MAX_PINS_PER_TYPE);
  
  if (error) {
    console.error('[getPinnedCases] Error:', error);
    return [];
  }
  
  if (!data) {
    return [];
  }
  
  return data.map((item) => ({
    id: item.id,
    caseId: item.id,
    caseName: item.case_name ?? item.client_name ?? 'Sin nombre', // ✅ Priorizar case_name
    clientName: item.client_name ?? 'Sin cliente', // ✅ Nombre del cliente separado
    createdAt: item.updated_at,
  }));
}

/**
 * Gets pinned clients for a user with full client data (decrypted names)
 * 
 * Uses Prisma transaction with decrypt_pii() to properly decrypt client names.
 * ✅ FASE ESTABILIZACIÓN: Retry logic con backoff exponencial para evitar
 * errores de "Unable to start transaction" por pool saturado.
 * 
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Array of pinned clients with decrypted names (max 10)
 */
export async function getPinnedClients(
  userId: string,
  orgId: string
): Promise<PinnedClient[]> {
  const pins = await getUserPins(userId);
  
  if (pins.clients.length === 0) {
    return [];
  }
  
  const encryptionKey = process.env.APP_ENCRYPTION_KEY;
  if (!encryptionKey) {
    console.error('[getPinnedClients] APP_ENCRYPTION_KEY not configured');
    return [];
  }
  
  // ✅ FASE ESTABILIZACIÓN: Retry logic con backoff
  const MAX_RETRIES = 3;
  const INITIAL_DELAY_MS = 500;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Use Prisma transaction to decrypt client names
      const clients = await prisma.$transaction(async (tx) => {
        // Set encryption key for this transaction
        await tx.$executeRaw`SELECT set_config('app.encryption_key', ${encryptionKey}, true)`;
        
        // Query and decrypt pinned clients
        // Using ANY() for array comparison in PostgreSQL
        return tx.$queryRaw<Array<{
          id: string;
          name: string | null;
          created_at: Date;
        }>>`
          SELECT 
            id::text,
            public.decrypt_pii(name_enc) as name,
            created_at
          FROM public.clients
          WHERE id = ANY(${pins.clients}::uuid[])
            AND org_id = ${orgId}::uuid
          ORDER BY created_at DESC
          LIMIT ${MAX_PINS_PER_TYPE}
        `;
      }, {
        timeout: 10000, // ✅ Reducido a 10 segundos (más agresivo)
        isolationLevel: 'ReadCommitted', // ✅ Nivel de aislamiento menos restrictivo
      });
      
      return clients.map((client) => ({
        id: client.id,
        clientId: client.id,
        clientName: client.name ?? 'Sin nombre',
        createdAt: client.created_at.toISOString(),
      }));
      
    } catch (error: any) {
      const isRetryable = 
        error.message?.includes('Unable to start a transaction') ||
        error.message?.includes('Connection pool timeout') ||
        error.code === 'P2024'; // Prisma timeout code
      
      if (isRetryable && attempt < MAX_RETRIES) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1); // 500ms, 1000ms, 2000ms
        console.warn(`[getPinnedClients] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      console.error('[getPinnedClients] Error decrypting clients (final):', error);
      return []; // ✅ Graceful degradation: devolver vacío en lugar de crashear
    }
  }
  
  return []; // Fallback si todos los reintentos fallan
}

/**
 * Gets pinned policies for a user with full policy data
 * 
 * Queries PolicyAnalysis records that are pinned by the user,
 * extracting readable names from the JSONB extractedData.
 * 
 * @param userId - User ID
 * @param orgId - Organization ID
 * @returns Array of pinned policies (max 10)
 */
export async function getPinnedPolicies(
  userId: string,
  orgId: string
): Promise<PinnedPolicy[]> {
  const pins = await getUserPins(userId);
  
  if (pins.policies.length === 0) {
    return [];
  }
  
  try {
    // Query pinned policies with artifact data for file name
    const policies = await prisma.policyAnalysis.findMany({
      where: {
        id: { in: pins.policies },
        orgId: orgId,
      },
      include: {
        artifact: {
          select: { fileName: true },
        },
      },
      take: MAX_PINS_PER_TYPE,
    });
    
    return policies.map((policy) => {
      // Extract readable name from extractedData JSONB
      const extractedData = policy.extractedData as Record<string, unknown> | null;
      
      // Try to build a meaningful name from extracted fields
      const policyNumber = extractStringField(extractedData, 'policy_number');
      const insurer = extractStringField(extractedData, 'insurer');
      const insuredName = extractStringField(extractedData, 'insured_name') || 
                          extractStringField(extractedData, 'policyholder');
      
      // Build policy name: prefer "Insurer #Number" or filename
      let policyName = policy.artifact?.fileName || 'Póliza sin nombre';
      if (insurer && policyNumber) {
        policyName = `${insurer} #${policyNumber}`;
      } else if (insurer) {
        policyName = insurer;
      } else if (policyNumber) {
        policyName = `Póliza #${policyNumber}`;
      }
      
      return {
        id: policy.id,
        policyId: policy.id,
        policyName: policyName,
        clientName: insuredName || 'Sin asegurado',
        createdAt: policy.extractedAt.toISOString(),
      };
    });
    
  } catch (error) {
    console.error('[getPinnedPolicies] Error fetching pinned policies:', error);
    return [];
  }
}

/**
 * Helper to safely extract string field from extractedData JSONB
 * Handles cases where value might be an object with 'name' property
 */
function extractStringField(
  data: Record<string, unknown> | null | undefined,
  field: string
): string | null {
  if (!data || !data[field]) return null;
  
  const value = data[field];
  
  if (typeof value === 'string') {
    return value || null;
  }
  
  // Handle nested object like { name: "...", contact: "..." }
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name === 'string') return obj.name;
    if (typeof obj.value === 'string') return obj.value;
    // Try first string value
    const firstString = Object.values(obj).find(v => typeof v === 'string' && v.length > 0);
    if (typeof firstString === 'string') return firstString;
  }
  
  return null;
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

