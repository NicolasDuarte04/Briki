import { redirect } from 'next/navigation';
import { getCurrentOrg } from '@/lib/helpers/getCurrentOrg';
import { 
  getLatestAgentThreadId, 
  createAgentThreadDraft 
} from '@/lib/data/workspace';
import { pathForAgentThread, normalizeLocale } from '@/lib/routes/workspace';

export const dynamic = 'force-dynamic';

/**
 * Agent Smart Redirector Page
 *
 * This server component acts as a smart redirector for the /agent route.
 * Its sole purpose is to guide the user to the correct agent thread.
 *
 * Behavior:
 * 1. It fetches the current user and their organization.
 * 2. It queries for the most recently updated agent thread for that org.
 * 3. If a thread is found, it redirects to that thread's specific URL
 *    (e.g., /es/agent/<thread-id>).
 * 4. If no threads exist, it creates a new draft thread and redirects to it.
 *
 * This ensures a seamless user experience, avoiding a dead-end page and
 * always landing the user in an active or new conversation context.
 *
 * This page does not render any UI; it always triggers a redirect.
 */
export default async function AgentPage({
  params,
}: {
  params: { locale: string };
}) {
  // 1. Get the authenticated user and their current organization.
  // This helper also handles redirects for unauthenticated users.
  const { user, currentOrg } = await getCurrentOrg();

  // 2. Find the most recent agent thread to continue from.
  let threadId = await getLatestAgentThreadId(user.id, currentOrg.id);

  // 3. If no thread exists, create a new one to start a conversation.
  if (!threadId) {
    // Fallback: If no threads exist, create a new draft to ensure
    // the user always lands on a valid thread.
    const newThread = await createAgentThreadDraft(user.id, currentOrg.id);
    threadId = newThread.id;
  }

  // 4. Redirect to the determined thread, preserving the current locale.
  const locale = normalizeLocale(params.locale);
  redirect(pathForAgentThread(threadId, locale));
}
