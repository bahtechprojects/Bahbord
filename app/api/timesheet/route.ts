import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const userIsAdmin = isAdmin(auth.role);
    const canSelfTrack = auth.can_track_time === true;
    if (!userIsAdmin && !canSelfTrack) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7';

    // Não-admin: filtra só os próprios entries
    const memberFilter = userIsAdmin ? '' : 'AND te.member_id = $2';
    const params: unknown[] = userIsAdmin ? [period] : [period, auth.id];

    const result = await query(
      `SELECT
        te.id, te.description, te.started_at, te.ended_at,
        te.duration_minutes, te.is_running, te.is_billable, te.created_at,
        m.display_name AS member_name,
        tf.ticket_key, tf.title AS ticket_title
      FROM time_entries te
      LEFT JOIN members m ON m.id = te.member_id
      LEFT JOIN tickets_full tf ON tf.id = te.ticket_id
      WHERE te.started_at > NOW() - ($1 || ' days')::interval ${memberFilter}
      ORDER BY te.started_at DESC`,
      params
    );

    const summary = await query(
      `SELECT
        m.display_name AS member_name,
        SUM(te.duration_minutes)::int AS total_minutes,
        SUM(CASE WHEN te.is_billable THEN te.duration_minutes ELSE 0 END)::int AS billable_minutes,
        SUM(CASE WHEN NOT te.is_billable THEN te.duration_minutes ELSE 0 END)::int AS non_billable_minutes,
        COUNT(te.id)::int AS entry_count
      FROM time_entries te
      LEFT JOIN members m ON m.id = te.member_id
      WHERE te.started_at > NOW() - ($1 || ' days')::interval ${memberFilter}
        AND te.is_running = false
      GROUP BY m.display_name
      ORDER BY total_minutes DESC`,
      params
    );

    return NextResponse.json({
      entries: result.rows,
      summary: summary.rows,
    });
  } catch (err) {
    console.error('GET /api/timesheet error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
