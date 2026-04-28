import { requireAdmin } from '@/lib/page-guards';

export default async function ClientsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
