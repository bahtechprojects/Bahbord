import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';

export async function GET() {
  try {
    const auth = await getAuthMember();
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Detect optional columns to be defensive against missing migrations
    const colCheck = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'members' AND column_name IN ('is_client', 'is_approved', 'phone', 'avatar_url', 'can_track_time')`
    );
    const cols = new Set(colCheck.rows.map((r) => r.column_name));
    const isClientExpr = cols.has('is_client') ? 'COALESCE(m.is_client, false)' : 'false';
    const isApprovedExpr = cols.has('is_approved') ? 'COALESCE(m.is_approved, false)' : 'true';
    const phoneExpr = cols.has('phone') ? 'm.phone' : 'NULL';
    const avatarExpr = cols.has('avatar_url') ? 'm.avatar_url' : 'NULL';
    const canTrackTimeExpr = cols.has('can_track_time') ? 'COALESCE(m.can_track_time, false)' : 'false';

    const sql = `
      SELECT
        m.id,
        m.display_name,
        m.email,
        ${phoneExpr} AS phone,
        ${avatarExpr} AS avatar_url,
        ${isApprovedExpr} AS is_approved,
        ${isClientExpr} AS is_client,
        ${canTrackTimeExpr} AS can_track_time,
        COALESCE(orr.role, m.role, 'member') AS role,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'project_id', p.id,
              'project_name', p.name,
              'project_color', p.color,
              'project_prefix', p.prefix,
              'role', pr.role
            ) ORDER BY p.name)
            FROM project_roles pr
            JOIN projects p ON p.id = pr.project_id
            WHERE pr.member_id = m.id AND p.is_archived = false
          ),
          '[]'::json
        ) AS projects
      FROM members m
      LEFT JOIN org_roles orr ON orr.member_id = m.id
      ORDER BY ${isApprovedExpr} DESC, m.display_name ASC NULLS LAST
    `;

    const result = await query(sql);
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/members/with-projects error:', err);
    const message = err instanceof Error ? err.message : 'Erro interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
