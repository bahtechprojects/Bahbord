import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function generateTicketDescription(title: string, context?: string): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Você é um assistente de gestão de projetos. Gere uma descrição completa e estruturada para o ticket a seguir. Use markdown com seções: **Contexto**, **Critérios de Aceitação**, **Observações**. Resposta em português BR. Seja conciso mas completo.\n\nTítulo: ${title}${context ? `\n\nContexto adicional: ${context}` : ''}`
    }]
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return text;
}

export async function suggestTicketAttributes(title: string, description: string): Promise<{ priority: string; labels: string[] }> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Analise este ticket e sugira prioridade e labels. Responda APENAS JSON com schema: {"priority": "urgent|high|medium|low", "labels": ["label1", "label2"]}. Título: ${title}\nDescrição: ${description}`
    }]
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : '{}');
  } catch {
    return { priority: 'medium', labels: [] };
  }
}

export async function suggestPriority(
  title: string,
  description: string
): Promise<{ priority: 'urgent' | 'high' | 'medium' | 'low'; reasoning: string }> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{
      role: 'user',
      content: `Você é um classificador de prioridade de tickets de gestão de projetos. Analise o título e a descrição abaixo e classifique a prioridade.

Sinais para cada nível:
- "urgent": bugs críticos, crashes, quedas em produção, perda de dados, impacto em usuários ativos, palavras como "urgente", "crítico", "produção", "down", "quebrado"
- "high": bugs importantes (não-críticos), bloqueios de fluxo, features prioritárias com prazo, regressões
- "medium": novas features, melhorias relevantes, refatorações com impacto
- "low": chores, cleanup, ajustes cosméticos, documentação, nice-to-haves, pequenos ajustes visuais

Responda APENAS com JSON válido no schema: {"priority": "urgent|high|medium|low", "reasoning": "frase curta em português BR explicando o motivo"}.

Título: ${title}
Descrição: ${description || '(sem descrição)'}`
    }]
  });
  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : '{}');
    const priority = ['urgent', 'high', 'medium', 'low'].includes(parsed.priority)
      ? parsed.priority
      : 'medium';
    return { priority, reasoning: parsed.reasoning || '' };
  } catch {
    return { priority: 'medium', reasoning: '' };
  }
}

export async function summarizeThread(comments: string[]): Promise<string> {
  if (comments.length === 0) return '';
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `Resuma esta thread de comentários em 2-3 frases, destacando decisões e próximos passos. Português BR.\n\nComentários:\n${comments.map((c, i) => `${i+1}. ${c}`).join('\n')}`
    }]
  });
  return msg.content[0].type === 'text' ? msg.content[0].text : '';
}
