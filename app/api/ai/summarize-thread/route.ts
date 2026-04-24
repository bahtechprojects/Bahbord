import { NextResponse } from 'next/server';
import { summarizeThread } from '@/lib/ai';
import { getAuthMember } from '@/lib/api-auth';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { ticket_id } = await request.json();
    if (!ticket_id) return NextResponse.json({ error: 'ticket_id obrigatório' }, { status: 400 });

    const result = await query<{ body: string }>(
      `SELECT body
       FROM comments
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticket_id]
    );

    const comments = result.rows.map((row) => (row.body || '').trim()).filter(Boolean);
    if (comments.length === 0) {
      return NextResponse.json({ summary: '', count: 0 });
    }

    const summary = await summarizeThread(comments);
    return NextResponse.json({ summary, count: comments.length });
  } catch (err) {
    console.error('AI summarize-thread error:', err);
    return NextResponse.json({ error: 'Erro ao resumir thread' }, { status: 500 });
  }
}
