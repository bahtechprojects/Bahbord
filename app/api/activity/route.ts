import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await getAuthMember();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const limitParam = parseInt(searchParams.get('limit') || '12');
    const limit = Math.min(50, Math.max(1, limitParam));

    const isValidUuid = projectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);

    const projectFilter = isValidUuid ? `AND t.project_id = $2` : '';
    const params: unknown[] = isValidUuid ? [limit, projectId] : [limit];

    const result = await query(`
      SELECT
        a.id, a.ticket_id, a.action, a.field_name, a.old_value, a.new_value, a.created_at,
        t.ticket_key, t.title AS ticket_title,
        m.display_name AS actor_name
      FROM activity_log a
      JOIN tickets_full t ON t.id = a.ticket_id
      LEFT JOIN members m ON m.id = a.member_id
      WHERE t.is_archived = false ${projectFilter}
      ORDER BY a.created_at DESC
      LIMIT $1
    `, params);

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/activity error:', err);
    return NextResponse.json([], { status: 200 });
  }
}
