import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    if (!projectId) {
      return NextResponse.json({ error: 'project_id é obrigatório' }, { status: 400 });
    }

    const result = await query(
      `SELECT
        b.id, b.project_id, b.name, b.description, b.type,
        b.filter_query, b.is_default, b.created_at, b.updated_at,
        (SELECT COUNT(*) FROM tickets t WHERE t.board_id = b.id)::int AS ticket_count
      FROM boards b
      WHERE b.project_id = $1
      ORDER BY b.is_default DESC, b.name ASC`,
      [projectId]
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/boards error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { project_id, name, type, description } = body;

    if (!project_id || !name) {
      return NextResponse.json({ error: 'project_id e name são obrigatórios' }, { status: 400 });
    }

    const validTypes = ['kanban', 'scrum', 'simple'];
    if (type && !validTypes.includes(type)) {
      return NextResponse.json({ error: `type inválido. Use: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO boards (project_id, name, type, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [project_id, name, type || 'kanban', description || null]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('POST /api/boards error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (name !== undefined) { sets.push(`name = $${idx}`); values.push(name); idx++; }
    if (description !== undefined) { sets.push(`description = $${idx}`); values.push(description); idx++; }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    sets.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE boards SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error('PATCH /api/boards error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const result = await query(
      `DELETE FROM boards WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Board não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/boards error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
