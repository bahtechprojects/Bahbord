import { test, expect } from '@playwright/test';

/**
 * Fluxo crítico #1 — Admin cria um ticket e ele aparece na coluna NÃO INICIADO.
 *
 * TODO(setup): substituir BOARD_ID por um board real do seu Postgres seed.
 *   Você pode pegar via:
 *     SELECT id FROM boards LIMIT 1;
 *   Ou setar via env:
 *     E2E_BOARD_ID=<uuid>
 *   Idealmente o script de seed cria um board fixo com UUID estável.
 */
const BOARD_ID = process.env.E2E_BOARD_ID ?? 'REPLACE_WITH_REAL_BOARD_ID';

test.describe('Criar ticket', () => {
  test.skip(
    BOARD_ID === 'REPLACE_WITH_REAL_BOARD_ID',
    'Defina E2E_BOARD_ID no .env.local com um board UUID válido do seed.'
  );

  test('admin cria ticket via header e ele aparece na coluna NÃO INICIADO', async ({ page }) => {
    await page.goto(`/board?board_id=${BOARD_ID}`);

    // Header > "Novo ticket" (texto exato no Header.tsx)
    await page.getByRole('button', { name: /novo ticket/i }).click();

    // Modal abre — preenche título.
    const title = `Teste E2E ${Date.now()}`;
    await page.getByPlaceholder(/título|title/i).first().fill(title);

    // Submete (botão "Criar" do CreateTicketModal).
    // TODO: ajustar o seletor se o botão tiver outro label/locator no modal.
    await page.getByRole('button', { name: /^criar$|^salvar$|^criar ticket$/i }).click();

    // Espera o modal fechar.
    await expect(page.getByPlaceholder(/título|title/i)).toBeHidden({ timeout: 10_000 });

    // O título deve aparecer no board.
    const card = page.getByText(title, { exact: false }).first();
    await expect(card).toBeVisible({ timeout: 10_000 });

    // Verifica que o card está dentro da coluna NÃO INICIADO.
    // KanbanColumn renderiza header com o nome da status — assumimos data-status="todo"
    // ou um header textual "NÃO INICIADO" / "Não iniciado".
    // TODO: confirmar o seletor exato em KanbanColumn.tsx (data-status vs header text).
    const todoColumn = page
      .locator('[data-column="todo"], [data-status="todo"]')
      .or(page.locator('section,div').filter({ hasText: /não iniciado/i }))
      .first();

    await expect(todoColumn).toContainText(title, { timeout: 10_000 });
  });
});
