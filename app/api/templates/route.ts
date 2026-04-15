import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(
      `SELECT id, name, description, config, is_system, created_at
       FROM project_templates
       ORDER BY is_system DESC, name ASC`
    );

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error('GET /api/templates error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
