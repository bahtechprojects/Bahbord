export const dynamic = "force-dynamic";
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import ViewTabsWrapper from '@/components/layout/ViewTabsWrapper';
import TimesheetView from '@/components/timesheet/TimesheetView';
import { requireApproved } from '@/lib/page-guards';
import { isAdmin } from '@/lib/api-auth';
import { redirect } from 'next/navigation';

export default async function TimesheetPage() {
  // Acesso: admin (vê tudo) OU member com can_track_time (vê só os próprios)
  const auth = await requireApproved();
  const allowed = isAdmin(auth.role) || auth.can_track_time === true;
  if (!allowed) redirect('/my-tasks');
  return (
    <div className="flex h-screen overflow-hidden bg-surface text-primary">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <ViewTabsWrapper />
        <main className="flex-1 overflow-auto p-6">
          <TimesheetView />
        </main>
      </div>
    </div>
  );
}
