import { requireAdmin } from '@/lib/page-guards';

export default async function ProjectsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
