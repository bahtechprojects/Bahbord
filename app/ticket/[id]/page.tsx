import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import TicketDetailView from '@/components/tickets/TicketDetailView';
import { requireApproved } from '@/lib/page-guards';

interface TicketPageProps {
  params: { id: string };
}

export default async function TicketPage({ params }: TicketPageProps) {
  await requireApproved();
  return (
    <div className="flex h-screen overflow-hidden bg-surface text-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <TicketDetailView ticketId={params.id} />
        </main>
      </div>
    </div>
  );
}
