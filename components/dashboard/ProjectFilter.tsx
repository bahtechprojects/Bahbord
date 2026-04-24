'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  color: string;
}

export default function ProjectFilter({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentId = searchParams.get('project_id') || '';

  function handleChange(id: string) {
    if (id) {
      router.push(`/?project_id=${id}` as any);
    } else {
      router.push('/');
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500">Projeto:</span>
      <select
        value={currentId}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-border/40 bg-surface2 px-3 py-1.5 text-sm text-slate-200 outline-none focus:border-accent/60"
      >
        <option value="">Todos os projetos</option>
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
