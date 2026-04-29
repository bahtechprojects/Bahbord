/**
 * Helpers para recurring tickets.
 *
 * - computeNextRunAt: calcula a próxima ocorrência de uma cron expression.
 *   Usa o pacote `cron-parser` (carregado dinamicamente para não quebrar
 *   o build caso ainda não esteja instalado — adicionamos no package.json
 *   mas o `npm install` é responsabilidade do operador).
 * - renderTitleTemplate: substitui as variáveis {{date}} {{week}} {{month}}
 *   no title_template ao criar o ticket.
 */

type CronParserModule = {
  parseExpression: (expr: string, options?: { currentDate?: Date; tz?: string }) => {
    next: () => { toDate: () => Date };
  };
};

let cachedParser: CronParserModule | null = null;
function loadCronParser(): CronParserModule {
  if (cachedParser) return cachedParser;
  try {
    // require dinâmico: se o pacote não estiver instalado, lança erro claro.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('cron-parser') as CronParserModule;
    cachedParser = mod;
    return mod;
  } catch {
    throw new Error(
      'Pacote "cron-parser" não está instalado. Rode `npm install cron-parser` para habilitar recurring tickets.'
    );
  }
}

/**
 * Calcula o próximo horário de execução para uma cron expression.
 * Lança Error com mensagem amigável se a expressão for inválida.
 */
export function computeNextRunAt(cronExpression: string, from: Date = new Date()): Date {
  const parser = loadCronParser();
  try {
    const interval = parser.parseExpression(cronExpression, { currentDate: from });
    return interval.next().toDate();
  } catch (err) {
    throw new Error((err as Error).message || 'cron expression inválida');
  }
}

/**
 * Substitui {{date}} {{week}} {{month}} no template do título.
 * - date: ISO yyyy-mm-dd
 * - week: número ISO da semana (1-53)
 * - month: nome do mês em pt-BR
 */
export function renderTitleTemplate(template: string, runDate: Date = new Date()): string {
  const isoDate = runDate.toISOString().slice(0, 10);
  const week = isoWeekNumber(runDate);
  const monthName = runDate.toLocaleString('pt-BR', { month: 'long' });

  return template
    .replace(/\{\{\s*date\s*\}\}/g, isoDate)
    .replace(/\{\{\s*week\s*\}\}/g, String(week))
    .replace(/\{\{\s*month\s*\}\}/g, monthName);
}

/** ISO week number (1-53). Algoritmo padrão. */
function isoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = target.getTime() - firstThursday.getTime();
  return 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
}
