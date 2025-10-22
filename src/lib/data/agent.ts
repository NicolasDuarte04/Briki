/**
 * Agent thread queries - SSR optimized, org-scoped
 * 
 * Provides narrow utilities for agent thread management:
 * - Fetch latest thread for resuming conversations
 * - Create draft threads for new conversations
 * 
 * CURRENT STATE (v1):
 * - Org-scoped only (no user filtering)
 * - Uses cases table as thread storage
 * - Minimal field selection for performance
 * 
 * FUTURE MIGRATION:
 * - Add user/owner filtering once schema supports it
 * - Consider dedicated threads/conversations table
 */

import { createServerSupabase } from '@/lib/supabase/server';

/**
 * Gets the ID of the most recent agent thread for an organization
 * 
 * Returns the latest updated thread regardless of age (no date filtering).
 * Useful for "continue where you left off" redirects.
 * 
 * TODO: Once created_by/owner_id or participants relation exists, 
 *       add .eq('created_by', userId) filtering to scope by user
 * TODO index: (org_id, updated_at desc) on cases table for performance
 * TODO RLS: ensure org_id = auth.org_id(); when created_by added, 
 *           enforce created_by = auth.uid() or membership in participants
 * 
 * @param userId - User ID (reserved for future use, not currently filtered)
 * @param orgId - Organization ID to scope the query
 * @returns The thread ID or null if no threads exist
 */
export async function getLatestAgentThreadId(
  userId: string,
  orgId: string
): Promise<string | null> {
  try {
    const supabase = await createServerSupabase();

    const { data, error } = await supabase
      .from('cases')
      .select('id')
      .eq('org_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.id;
  } catch (error) {
    // Gracefully handle any errors (network, auth, etc.)
    console.error('Error fetching latest agent thread:', error);
    return null;
  }
}

/**
 * Creates a new draft agent thread for an organization
 * 
 * Inserts a minimal case record with standard defaults:
 * - status: 'draft'
 * - stage: 'initial'
 * - priority: 'medium'
 * - client_name: 'Nuevo chat'
 * 
 * TODO: When created_by is added to schema, include created_by: userId in insert
 * TODO RLS: ensure insert policy checks org membership (user must be in org_members)
 * 
 * @param userId - User ID (reserved for future ownership tracking)
 * @param orgId - Organization ID for the new thread
 * @returns The new thread ID
 * @throws Error if creation fails
 */
export async function createAgentThreadDraft(
  userId: string,
  orgId: string
): Promise<string> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from('cases')
    .insert({
      org_id: orgId,
      status: 'draft',
      stage: 'initial',
      priority: 'medium',
      client_name: 'Nuevo chat',
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('Error creating agent thread draft:', error);
    throw new Error(
      error?.message || 'Failed to create agent thread draft'
    );
  }

  return data.id;
}

