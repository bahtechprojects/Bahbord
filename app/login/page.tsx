'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Member {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
}

export default function LoginPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/options?type=members')
      .then((res) => res.json())
      .then((data) => {
        setMembers(data);
        if (data.length > 0) {
          setSelectedMemberId(data[0].id);
        }
      })
      .catch(() => setError('Erro ao carregar membros'));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMemberId) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: selectedMemberId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao fazer login');
      }

      router.push('/board');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0f0f0f',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '32px',
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        border: '1px solid #2a2a2a',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 700,
          color: '#e0e0e0',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Bahjira
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#888',
          marginBottom: '24px',
          textAlign: 'center',
        }}>
          Selecione seu perfil para continuar
        </p>

        {error && (
          <div style={{
            padding: '10px 14px',
            marginBottom: '16px',
            backgroundColor: '#3a1a1a',
            border: '1px solid #5a2a2a',
            borderRadius: '8px',
            color: '#f87171',
            fontSize: '13px',
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            color: '#aaa',
            marginBottom: '6px',
          }}>
            Membro
          </label>
          <select
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            disabled={members.length === 0}
            style={{
              width: '100%',
              padding: '10px 12px',
              backgroundColor: '#252525',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#e0e0e0',
              fontSize: '14px',
              marginBottom: '20px',
              cursor: 'pointer',
            }}
          >
            {members.length === 0 && (
              <option value="">Carregando...</option>
            )}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name} ({m.email})
              </option>
            ))}
          </select>

          <button
            type="submit"
            disabled={loading || !selectedMemberId}
            style={{
              width: '100%',
              padding: '10px',
              backgroundColor: loading ? '#333' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
