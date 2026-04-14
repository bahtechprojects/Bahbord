import { cookies } from 'next/headers';

/**
 * Get the current authenticated member ID from the session cookie.
 * Returns null if no member is logged in.
 */
export async function getCurrentMemberId(): Promise<string | null> {
  const cookieStore = await cookies();
  const memberId = cookieStore.get('bahjira-member-id')?.value;
  return memberId || null;
}

/**
 * Get the current workspace ID from the session cookie.
 * Returns null if no workspace is selected.
 */
export async function getCurrentWorkspaceId(): Promise<string | null> {
  const cookieStore = await cookies();
  const wsId = cookieStore.get('bahjira-workspace-id')?.value;
  return wsId || null;
}
