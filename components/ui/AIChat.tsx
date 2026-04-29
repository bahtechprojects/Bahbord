'use client';

import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Database } from 'lucide-react';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  sql?: string;
  rows?: Record<string, unknown>[];
  rowCount?: number;
  error?: string;
}

export default function AIChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listener pra evento custom abrir/fechar
  useEffect(() => {
    function toggle() { setOpen((v) => !v); }
    window.addEventListener('ai-chat:toggle', toggle);
    return () => window.removeEventListener('ai-chat:toggle', toggle);
  }, []);

  // Esc fecha
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Auto-focus + scroll
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setHistory((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history.map((h) => ({ role: h.role, content: h.content })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setHistory((prev) => [...prev, { role: 'assistant', content: data.error || 'Erro' }]);
      } else if (data.type === 'text') {
        setHistory((prev) => [...prev, { role: 'assistant', content: data.text }]);
      } else if (data.type === 'sql') {
        setHistory((prev) => [...prev, {
          role: 'assistant',
          content: data.explanation,
          sql: data.sql,
          rows: data.rows,
          rowCount: data.rowCount,
        }]);
      } else if (data.type === 'sql_error') {
        setHistory((prev) => [...prev, {
          role: 'assistant',
          content: data.explanation,
          sql: data.sql,
          error: data.error,
        }]);
      }
    } catch {
      setHistory((prev) => [...prev, { role: 'assistant', content: 'Erro de rede. Tenta de novo.' }]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[60] w-full md:w-[420px] flex flex-col border-l border-[var(--card-border)] bg-[var(--modal-bg)] shadow-2xl shadow-black/50 animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-[var(--accent)]" />
          <h3 className="font-serif text-[15px] text-primary">Pergunta pra IA</h3>
        </div>
        <button onClick={() => setOpen(false)} className="rounded p-1 text-secondary hover:bg-[var(--overlay-hover)] hover:text-primary">
          <X size={14} />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {history.length === 0 && (
          <div className="text-center py-8">
            <Sparkles size={28} className="mx-auto text-[var(--accent)] mb-3" />
            <p className="text-[13px] text-secondary">Faça perguntas sobre seus dados.</p>
            <div className="mt-4 space-y-2">
              {[
                'Quantos tickets do Paulo estão atrasados?',
                'Quais projetos têm mais tickets em aberto?',
                'Sprint atual, quantos % concluídos?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); setTimeout(() => send(), 50); }}
                  className="block w-full text-left text-[12px] text-[var(--accent)] hover:underline"
                >
                  → {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
            {m.role === 'user' ? (
              <div className="max-w-[80%] rounded-md bg-[var(--accent)] px-3 py-2 text-[13px] text-white">
                {m.content}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-[13px] text-primary leading-relaxed">{m.content}</div>
                {m.sql && (
                  <details className="text-[11px]">
                    <summary className="cursor-pointer text-secondary hover:text-primary flex items-center gap-1">
                      <Database size={10} /> SQL gerado
                    </summary>
                    <pre className="mt-1 rounded bg-[var(--overlay-subtle)] p-2 font-mono text-[10px] text-secondary overflow-x-auto whitespace-pre-wrap">{m.sql}</pre>
                  </details>
                )}
                {m.error && (
                  <div className="rounded border border-red-500/30 bg-red-500/5 p-2 text-[11px] text-red-400 font-mono">{m.error}</div>
                )}
                {m.rows && m.rows.length > 0 && (
                  <div className="rounded border border-[var(--card-border)] overflow-hidden">
                    <table className="w-full text-[11px]">
                      <thead className="bg-[var(--overlay-subtle)]">
                        <tr>
                          {Object.keys(m.rows[0]).slice(0, 4).map((k) => (
                            <th key={k} className="px-2 py-1 text-left font-medium text-secondary">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.rows.slice(0, 20).map((row, ri) => (
                          <tr key={ri} className="border-t border-[var(--card-border)]">
                            {Object.keys(m.rows![0]).slice(0, 4).map((k) => (
                              <td key={k} className="px-2 py-1 text-primary truncate max-w-[100px]">
                                {String(row[k] ?? '—').substring(0, 60)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {m.rows.length > 20 && (
                      <div className="bg-[var(--overlay-subtle)] px-2 py-1 text-[10px] text-secondary text-center">
                        Mostrando 20 de {m.rowCount} resultados
                      </div>
                    )}
                  </div>
                )}
                {m.rows && m.rows.length === 0 && (
                  <p className="text-[11px] text-[var(--text-tertiary)] italic">Sem resultados</p>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-secondary">
            <Loader2 size={12} className="animate-spin" />
            Pensando…
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--card-border)] p-3">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre seus dados..."
            disabled={loading}
            className="input-premium flex-1 text-[13px]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-premium btn-primary disabled:opacity-50"
          >
            <Send size={13} />
          </button>
        </form>
        <p className="mt-1.5 text-[10px] text-[var(--text-tertiary)]">
          Powered by Claude Haiku 4.5 · só admin · Esc fecha
        </p>
      </div>
    </div>
  );
}
