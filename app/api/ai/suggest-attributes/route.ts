import { NextResponse } from 'next/server';
import { suggestTicketAttributes } from '@/lib/ai';
import { getAuthMember } from '@/lib/api-auth';

export async function POST(request: Request) {
  try {
    const auth = await getAuthMember();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { title, description } = await request.json();
    if (!title) return NextResponse.json({ error: 'title obrigatório' }, { status: 400 });
    const suggestion = await suggestTicketAttributes(title, description || '');
    return NextResponse.json(suggestion);
  } catch (err) {
    console.error('AI suggest-attributes error:', err);
    return NextResponse.json({ error: 'Erro ao sugerir atributos' }, { status: 500 });
  }
}
