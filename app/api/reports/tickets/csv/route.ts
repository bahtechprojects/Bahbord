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
        ticket_key, title, priority, status_name, service_name, assignee_name,
        reporter_name, client_name, sprint_name, type_name,
        to_char(due_date, 'DD/MM/YYYY') AS due_date,
        to_char(created_at, 'DD/MM/YYYY HH24:MI') AS created_at,
        to_char(completed_at, 'DD/MM/YYYY HH24:MI') AS completed_at
       FROM tickets_full
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    // Build CSV
    const headers = ['Key', 'Título', 'Prioridade', 'Status', 'Serviço', 'Responsável', 'Relator', 'Cliente', 'Sprint', 'Tipo', 'Data Limite', 'Criado', 'Concluído'];
    const rows = result.rows.map((r: any) => [
      r.ticket_key, r.title, r.priority, r.status_name, r.service_name, r.assignee_name,
      r.reporter_name, r.client_name, r.sprint_name, r.type_name, r.due_date, r.created_at, r.completed_at,
    ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));

    const csv = '﻿' + [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tickets-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (err) {
    console.error('CSV export error:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
