export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import OnboardingWizard from '@/components/onboarding/OnboardingWizard';
import { requireAdmin } from '@/lib/page-guards';
import { query, getDefaultWorkspaceId } from '@/lib/db';

/**
 * /onboarding — wizard de 3 passos (primeiro projeto, convidar pessoas, pronto).
 * Renderiza fullscreen, sem sidebar/header, para foco total.
 *
 * Acessível só pra admin/owner. Se o workspace já tem projetos OU já foi
 * marcado como onboarded, redireciona pra Dashboard.
 */
export default async function OnboardingPage() {
  const auth = await requireAdmin();

  // Se já tem projeto OU já completou onboarding, manda pra Dashboard.
  // (idempotente: ALTER ADD COLUMN IF NOT EXISTS é seguro mesmo em first run.)
  await query(`ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ`).catch(() => {});

  const wsId = await getDefaultWorkspaceId();
  const check = await query<{ projects: number; onboarded: boolean | null }>(
    `SELECT
       (SELECT COUNT(*) FROM projects WHERE workspace_id = $1)::int AS projects,
       (SELECT onboarded_at IS NOT NULL FROM workspaces WHERE id = $1) AS onboarded`,
    [wsId]
  );
  const row = check.rows[0];
  if (row && (row.projects > 0 || row.onboarded === true)) {
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-surface text-primary">
      <OnboardingWizard ownerName={auth.display_name} />
    </div>
  );
}
