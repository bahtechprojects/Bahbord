'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function ApprovalGate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'loading' | 'approved' | 'pending'>('loading');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data.authenticated) {
          setStatus('pending');
        } else if (data.member?.is_approved === false) {
          setStatus('pending');
        } else {
          setStatus('approved');
        }
      })
      .catch(() => setStatus('approved'));
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <div className="rounded-full bg-amber-500/10 p-4 mb-4">
          <Clock size={32} className="text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Aguardando aprovação</h2>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          Seu acesso está sendo analisado pelo administrador da organização.
          Você será notificado quando for aprovado.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
