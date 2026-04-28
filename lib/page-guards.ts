import { redirect } from 'next/navigation';
import { getAuthMember, isAdmin, type AuthMember } from './api-auth';

/**
 * Garantir que o usuário está autenticado.
 * Redireciona para /sign-in se não estiver.
 */
export async function requireAuth(): Promise<AuthMember> {
  const auth = await getAuthMember();
  if (!auth) redirect('/sign-in');
  return auth;
}

/**
 * Garantir que o usuário está autenticado E aprovado pela organização.
 * - Não autenticado → /sign-in
 * - Autenticado mas pendente → /pending-approval
 * - Admin/owner sempre passam (não precisam de aprovação)
 */
export async function requireApproved(): Promise<AuthMember> {
  const auth = await requireAuth();
  if (isAdmin(auth.role)) return auth;
  if (!auth.is_approved) redirect('/pending-approval');
  return auth;
}

/**
 * Garantir que o usuário é admin/owner da organização.
 * - Não autenticado → /sign-in
 * - Não admin → /my-tasks (sua landing pessoal)
 */
export async function requireAdmin(): Promise<AuthMember> {
  const auth = await requireAuth();
  if (!isAdmin(auth.role)) redirect('/my-tasks');
  return auth;
}
