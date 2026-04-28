import { requireAdmin } from '@/lib/page-guards';

export default async function TeamsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
