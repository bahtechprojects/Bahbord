import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { query } from '@/lib/db';
import { getAuthMember, isAdmin } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/ai/chat
 * Body: { message: string, history?: Array<{ role, content }> }
 * Admin-only. Permite consultar dados via SQL gerado por IA, com limites:
 * - SOMENTE SELECT (rejeita INSERT/UPDATE/DELETE/DDL)
 * - LIMIT máximo 100 rows
 * - Tabelas/views permitidas: tickets_full, projects, members, sprints, statuses
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth || !isAdmin(auth.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    if (!checkRateLimit(`ai-chat:${auth.id}`, 30, 60_000)) {
      return NextResponse.json({ error: 'Muitas requisições. Aguarde.' }, { status: 429 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
    }

    const { message, history = [] } = await request.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: 'message obrigatório' }, { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = `Você é um assistente do Bah!Flow (sistema de gestão de projetos). O admin pode te perguntar sobre os dados do workspace e você responde executando SQL no banco Postgres.

REGRAS RÍGIDAS:
1. APENAS SELECT. Nunca INSERT/UPDATE/DELETE/DROP/ALTER/CREATE.
2. Sempre incluir LIMIT 100 (ou menor) no final.
3. Use APENAS estas views/tabelas: tickets_full, projects, members, sprints, statuses, services.
4. Quando precisar consultar dados, gere o SQL e responda APENAS com o JSON: {"sql": "SELECT ...;", "explanation": "frase em português explicando o que vai buscar"}.
5. Se a pergunta não precisar de SQL (ex: "olá", "obrigado"), responda em texto normal sem JSON.
6. Se precisar de mais contexto, peça antes de gerar SQL.

Schema relevante:
- tickets_full: id, ticket_key, title, priority (urgent|high|medium|low), status_name, status_color, is_done, type_name, assignee_id, assignee_name, reporter_name, project_id, project_name, sprint_name, due_date, created_at, completed_at, is_archived
- projects: id, name, prefix, color, is_archived, created_at
- members: id, display_name, email, role, is_approved, can_track_time
- sprints: id, name, project_id, is_active, start_date, end_date
- statuses: id, name, color, is_done, position`;

    const messages: { role: 'user' | 'assistant'; content: string }[] = [
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role === 'user' ? ('user' as const) : ('assistant' as const),
        content: h.content,
      })),
      { role: 'user', content: message },
    ];

    const completion = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const aiText = completion.content[0]?.type === 'text' ? completion.content[0].text : '';

    // Tenta parsear JSON com SQL
    const jsonMatch = aiText.match(/\{[\s\S]*"sql"[\s\S]*\}/);
    if (!jsonMatch) {
      // Resposta em texto normal
      return NextResponse.json({ type: 'text', text: aiText });
    }

    let parsed: { sql: string; explanation: string };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ type: 'text', text: aiText });
    }

    const sql = parsed.sql.trim();
    // Validações de segurança
    const upperSql = sql.toUpperCase();
    if (!upperSql.trim().startsWith('SELECT')) {
      return NextResponse.json({ type: 'text', text: 'Só consigo executar consultas SELECT. ' + parsed.explanation });
    }
    const dangerous = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXECUTE)\b/i;
    if (dangerous.test(sql)) {
      return NextResponse.json({ type: 'text', text: 'A consulta gerada teve comandos não permitidos. Tente reformular.' });
    }
    // Tabelas permitidas
    const allowedTables = /\b(tickets_full|tickets|projects|members|sprints|statuses|services|categories|ticket_types|board_roles|project_roles)\b/i;
    if (!allowedTables.test(sql)) {
      return NextResponse.json({ type: 'text', text: 'A consulta acessa tabelas não permitidas.' });
    }

    // Adiciona LIMIT 100 se não tiver
    let safeSql = sql.replace(/;\s*$/, '');
    if (!/\bLIMIT\b/i.test(safeSql)) {
      safeSql += ' LIMIT 100';
    }

    try {
      const result = await query(safeSql);
      return NextResponse.json({
        type: 'sql',
        explanation: parsed.explanation,
        sql: safeSql,
        rows: result.rows.slice(0, 100),
        rowCount: result.rowCount,
      });
    } catch (sqlErr) {
      return NextResponse.json({
        type: 'sql_error',
        explanation: parsed.explanation,
        sql: safeSql,
        error: sqlErr instanceof Error ? sqlErr.message : String(sqlErr),
      });
    }
  } catch (err) {
    console.error('POST /api/ai/chat error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro interno' }, { status: 500 });
  }
}
