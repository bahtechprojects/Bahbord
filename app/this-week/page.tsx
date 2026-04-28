export const dynamic = "force-dynamic";
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import PersonalTicketList from '@/components/personal/PersonalTicketList';
import ApprovalGate from '@/components/ui/ApprovalGate';
import { query } from '@/lib/db';
import { requireApproved } from '@/lib/page-guards';

export default async function ThisWeekPage() {
  const auth = await requireApproved();
  const memberId = auth?.id;

  let tickets: any[] = [];
  let queryError: string | null = null;
  if (memberId) {
    try {
      const result = await query(
        `SELECT
          t.id, t.ticket_key, t.title, t.priority,
          t.status_name, t.status_color,
          t.type_name, t.type_icon, t.type_color,
          t.assignee_name, t.due_date, t.completed_at,
          t.project_id, t.project_name, t.project_prefix,
          p.color AS project_color,
          t.updated_at
         FROM tickets_full t
         LEFT JOIN projects p ON p.id = t.project_id
         WHERE t.assignee_id = $1
           AND t.is_archived = false
           AND t.is_done = false
           AND t.due_date IS NOT NULL
           AND t.due_date >= date_trunc('week', NOW())
           AND t.due_date < date_trunc('week', NOW()) + INTERVAL '7 days'
         ORDER BY t.due_date ASC, t.priority ASC
         LIMIT 100`,
        [memberId]
      );
      tickets = result.rows;
    } catch (err) {
      queryError = err instanceof Error ? err.message : 'Erro desconhecido';
      console.error('this-week query error:', err);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <ApprovalGate>
            <div className="mx-auto max-w-[1100px] space-y-8">
              <div className="space-y-2">
                <p className="page-eyebrow">Workspace · Esta semana</p>
                <h1 className="page-title">
                  Esta semana <span className="em">— o que precisa entregar.</span>
                </h1>
                <p className="text-[13px] text-secondary">
                  {tickets.length === 0
                    ? 'Nada com prazo essa semana atribuído a você.'
                    : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'} com prazo até domingo.`}
                </p>
              </div>

              {queryError ? (
                <div className="card-premium border-red-500/30 bg-red-500/5 p-4">
                  <p className="text-[13px] font-medium text-red-400">Não consegui carregar a lista</p>
                  <p className="mt-1 text-[12px] text-red-300/80 font-mono">{queryError}</p>
                  <p className="mt-2 text-[11px] text-secondary">
                    Provavelmente uma migration está faltando. Rode o SQL em <code className="font-mono">db/036_view_project_color.sql</code> no banco.
                  </p>
                </div>
              ) : (
                <PersonalTicketList
                  tickets={tickets}
                  emptyMessage="Nenhum ticket com prazo nesta semana."
                />
              )}
            </div>
          </ApprovalGate>
        </main>
      </div>
    </div>
  );
}
