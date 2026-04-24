import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let whereClause = 'WHERE is_archived = false';
    const params: string[] = [];
    if (projectId) {
      params.push(projectId);
      whereClause += ` AND project_id = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      whereClause += ` AND created_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      whereClause += ` AND created_at <= $${params.length}`;
    }

    const result = await query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE is_done = true)::int AS done,
        COUNT(*) FILTER (WHERE is_done = false OR is_done IS NULL)::int AS open,
        COUNT(*) FILTER (WHERE priority = 'urgent')::int AS urgent,
        COUNT(*) FILTER (WHERE priority = 'high')::int AS high,
        COUNT(*) FILTER (WHERE priority = 'medium')::int AS medium,
        COUNT(*) FILTER (WHERE priority = 'low')::int AS low
       FROM tickets_full
       ${whereClause}`,
      params
    );

    return NextResponse.json(result.rows[0] || {
      total: 0, done: 0, open: 0, urgent: 0, high: 0, medium: 0, low: 0,
    });
  } catch (err) {
    console.error('Summary error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
