import OpenAI from 'openai';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

async function chat(systemOrUserContent: string, opts: { maxTokens?: number; jsonMode?: boolean } = {}): Promise<string> {
  const completion = await client.chat.completions.create({
    model: MODEL,
    max_tokens: opts.maxTokens ?? 500,
    messages: [{ role: 'user', content: systemOrUserContent }],
    ...(opts.jsonMode ? { response_format: { type: 'json_object' as const } } : {}),
  });
  return completion.choices[0]?.message?.content || '';
}

export async function generateTicketDescription(title: string, context?: string): Promise<string> {
  return chat(
    `Você é um assistente de gestão de projetos. Gere uma descrição completa e estruturada para o ticket a seguir. Use markdown com seções: **Contexto**, **Critérios de Aceitação**, **Observações**. Resposta em português BR. Seja conciso mas completo.\n\nTítulo: ${title}${context ? `\n\nContexto adicional: ${context}` : ''}`,
    { maxTokens: 500 }
  );
}

export async function suggestTicketAttributes(title: string, description: string): Promise<{ priority: string; labels: string[] }> {
  const text = await chat(
    `Analise este ticket e sugira prioridade e labels. Responda APENAS JSON com schema: {"priority": "urgent|high|medium|low", "labels": ["label1", "label2"]}.\n\nTítulo: ${title}\nDescrição: ${description}`,
    { maxTokens: 200, jsonMode: true }
  );
  try {
    return JSON.parse(text);
  } catch {
    return { priority: 'medium', labels: [] };
  }
}

export async function suggestPriority(
  title: string,
  description: string
): Promise<{ priority: 'urgent' | 'high' | 'medium' | 'low'; reasoning: string }> {
  const text = await chat(
    `Você é um classificador de prioridade de tickets de gestão de projetos. Analise o título e a descrição abaixo e classifique a prioridade.

Sinais para cada nível:
- "urgent": bugs críticos, crashes, quedas em produção, perda de dados, impacto em usuários ativos, palavras como "urgente", "crítico", "produção", "down", "quebrado"
- "high": bugs importantes (não-críticos), bloqueios de fluxo, features prioritárias com prazo, regressões
- "medium": novas features, melhorias relevantes, refatorações com impacto
- "low": chores, cleanup, ajustes cosméticos, documentação, nice-to-haves, pequenos ajustes visuais

Responda APENAS com JSON válido no schema: {"priority": "urgent|high|medium|low", "reasoning": "frase curta em português BR explicando o motivo"}.

Título: ${title}
Descrição: ${description || '(sem descrição)'}`,
    { maxTokens: 200, jsonMode: true }
  );
  try {
    const parsed = JSON.parse(text);
    const priority = ['urgent', 'high', 'medium', 'low'].includes(parsed.priority)
      ? (parsed.priority as 'urgent' | 'high' | 'medium' | 'low')
      : 'medium';
    return { priority, reasoning: parsed.reasoning || '' };
  } catch {
    return { priority: 'medium', reasoning: '' };
  }
}

export async function summarizeThread(comments: string[]): Promise<string> {
  if (comments.length === 0) return '';
  return chat(
    `Resuma esta thread de comentários em 2-3 frases, destacando decisões e próximos passos. Português BR.\n\nComentários:\n${comments.map((c, i) => `${i+1}. ${c}`).join('\n')}`,
    { maxTokens: 300 }
  );
}
