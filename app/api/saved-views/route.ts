import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';

/**
 * GET — lista views do user (próprias + compartilhadas no workspace)
 */
export async function GET() {
  try {
    const auth = await getAuthMember();
    if (!auth) return NextResponse.json([], { status: 200 });

    const result = await query(
      `SELECT id, name, icon, scope, filters, position, is_shared, created_at
       FROM saved_views
       WHERE member_id = $1 OR (is_shared = true AND workspace_id = $2)
       ORDER BY position ASC, created_at ASC`,
      [auth.id, auth.workspace_id]
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/saved-views error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

/**
 * POST — cria view nova
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();
    const { name, icon, scope, filters, is_shared } = body;
    if (!name) return NextResponse.json({ error: 'name obrigatório' }, { status: 400 });

    // Só admin pode marcar como shared
    const sharedFinal = is_shared && isAdmin(auth.role) ? true : false;

    const result = await query(
      `INSERT INTO saved_views (workspace_id, member_id, name, icon, scope, filters, is_shared)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, icon, scope, filters, position, is_shared`,
      [auth.workspace_id, auth.id, name, icon || null, scope || 'board', JSON.stringify(filters || {}), sharedFinal]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/saved-views error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

/**
 * DELETE — remove view (só dono ou admin)
 */
export async function DELETE(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const userIsAdmin = isAdmin(auth.role);
    const result = userIsAdmin
      ? await query(`DELETE FROM saved_views WHERE id = $1`, [id])
      : await query(`DELETE FROM saved_views WHERE id = $1 AND member_id = $2`, [id, auth.id]);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/saved-views error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
