/**
 * Activity logging server utility
 * 
 * Powers Continue + analytics by tracking user actions across the application.
 * Design: Fail-safe, non-blocking - never crashes the parent request.
 * 
 * TODO: Implement batching for high-frequency actions (view events)
 * TODO: Add retry queue for failed inserts (optional)
 */

import { createServerSupabase } from '@/lib/supabase/server';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Canonical action values for activity tracking
 * 
 * @property view - User viewed an entity (e.g., opened case detail)
 * @property edit - User edited an entity (e.g., updated case data)
 * @property upload - User uploaded a file/artifact
 * @property compare - User compared entities (e.g., policy comparison)
 * @property propose - User created/sent a proposal
 */
export type ActivityAction = 'view' | 'edit' | 'upload' | 'compare' | 'propose';

/**
 * Parameters for logging an activity
 */
export interface LogActivityParams {
  /** ID of the user performing the action */
  userId: string;
  /** ID of the organization context */
  orgId: string;
  /** Type of entity being acted upon (e.g., 'case', 'client', 'proposal', 'policy') */
  entityType: string;
  /** ID of the specific entity */
  entityId: string;
  /** Canonical action being performed */
  action: ActivityAction | string;
  /** Optional metadata for additional context */
  meta?: Record<string, unknown>;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Logs a user activity to the activities table
 * 
 * This function is fail-safe and non-blocking:
 * - If the insert fails, it logs a warning and continues
 * - Never throws errors to the caller
 * - Suitable for fire-and-forget usage in server actions
 * 
 * @example
 * ```ts
 * // Log a case view
 * await logActivity({
 *   userId: 'user-uuid',
 *   orgId: 'org-uuid',
 *   entityType: 'case',
 *   entityId: 'case-uuid',
 *   action: 'view',
 * });
 * 
 * // Log a proposal creation with metadata
 * await logActivity({
 *   userId: 'user-uuid',
 *   orgId: 'org-uuid',
 *   entityType: 'case',
 *   entityId: 'case-uuid',
 *   action: 'propose',
 *   meta: { proposalId: 'proposal-uuid', stage: 'quoted' }
 * });
 * ```
 * 
 * @param params - Activity logging parameters
 * @returns void - This function never throws
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const { userId, orgId, entityType, entityId, action, meta } = params;

  try {
    const supabase = await createServerSupabase();

    const { error } = await supabase
      .from('activities')
      .insert({
        user_id: userId,
        org_id: orgId,
        entity_type: entityType,
        entity_id: entityId,
        action,
        meta: meta || null,
      });

    if (error) {
      console.warn('[logActivity] Insert failed:', {
        error: error.message,
        userId,
        orgId,
        entityType,
        entityId,
        action,
      });
    }
  } catch (err) {
    // Swallow all errors - activity logging should never crash the request
    console.warn('[logActivity] Unexpected error:', err);
  }
}

