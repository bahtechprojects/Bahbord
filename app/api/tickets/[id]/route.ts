import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const result = await query(
    `SELECT
      tf.*,
      t.ticket_type_id,
      -- Parent info
      pw.prefix || '-' || LPAD(pt.sequence_number::text, 3, '0') AS parent_key,
      pt.title AS parent_title,
      -- Time tracking total
      COALESCE((SELECT SUM(duration_minutes) FROM time_entries te WHERE te.ticket_id = tf.id AND te.is_running = false), 0)::int AS total_time_minutes
    FROM tickets_full tf
    JOIN tickets t ON t.id = tf.id
    LEFT JOIN tickets pt ON pt.id = t.parent_id
    LEFT JOIN workspaces pw ON pw.id = pt.workspace_id
    WHERE tf.id = $1`,
    [params.id]
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const ticketId = params.id;

  const allowedFields: Record<string, string> = {
    title: 'title',
    description: 'description',
    priority: 'priority',
    due_date: 'due_date',
    status_id: 'status_id',
    assignee_id: 'assignee_id',
    reporter_id: 'reporter_id',
    service_id: 'service_id',
    category_id: 'category_id',
    sprint_id: 'sprint_id',
    ticket_type_id: 'ticket_type_id',
    parent_id: 'parent_id',
  };

  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, col] of Object.entries(allowedFields)) {
    if (key in body) {
      sets.push(`${col} = $${idx}`);
      values.push(body[key]);
      idx++;
    }
  }

  if (sets.length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
  }

  sets.push(`updated_at = NOW()`);
  values.push(ticketId);

  const result = await query(
    `UPDATE tickets SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ error: 'Ticket não encontrado' }, { status: 404 });
  }

  return NextResponse.json(result.rows[0]);
}
