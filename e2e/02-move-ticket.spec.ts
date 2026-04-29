import { test, expect } from '@playwright/test';

/**
 * Fluxo crítico #2 — Mover um card entre colunas via drag-and-drop.
 *
 * TODO(setup): definir E2E_BOARD_ID e (opcional) E2E_TICKET_ID via env.
 *   Se E2E_TICKET_ID não for setado, o teste pega o primeiro card que encontrar.
 *
 * Observação: o board usa @dnd-kit. `page.dragAndDrop()` cobre o caso comum,
 * mas se @dnd-kit exigir mouse moves intermediários, troque por:
 *   await source.hover(); await page.mouse.down();
 *   await target.hover({ position: { x: 10, y: 50 } }); await page.mouse.up();
 */
const BOARD_ID = process.env.E2E_BOARD_ID ?? 'REPLACE_WITH_REAL_BOARD_ID';
const TICKET_ID = process.env.E2E_TICKET_ID; // opcional

test.describe('Mover ticket', () => {
  test.skip(
    BOARD_ID === 'REPLACE_WITH_REAL_BOARD_ID',
    'Defina E2E_BOARD_ID no .env.local com um board UUID válido.'
  );

  test('drag-and-drop: card vai para coluna EM PROGRESSO', async ({ page }) => {
    await page.goto(`/board?board_id=${BOARD_ID}`);

    // Localiza colunas pelo data attribute (assumindo `data-status` em KanbanColumn).
    // TODO: confirmar seletor real em components/board/KanbanColumn.tsx.
    const todoColumn = page
      .locator('[data-column="todo"], [data-status="todo"]')
      .or(page.locator('section,div').filter({ hasText: /não iniciado/i }))
      .first();

    const progressColumn = page
      .locator('[data-column="progress"], [data-status="progress"]')
      .or(page.locator('section,div').filter({ hasText: /em progresso/i }))
      .first();

    await expect(todoColumn).toBeVisible();
    await expect(progressColumn).toBeVisible();

    // Pega o card a mover.
    const source = TICKET_ID
      ? page.locator(`[data-ticket-id="${TICKET_ID}"]`)
      : todoColumn.locator('[data-ticket-id], [draggable="true"], article, [role="button"]').first();

    await expect(source).toBeVisible();
    const cardTitle = (await source.innerText()).split('\n')[0].trim();

    // Drag-and-drop. Para @dnd-kit pode ser necessário mover o mouse "lentamente".
    await source.dragTo(progressColumn);

    // Verifica que o card agora está na coluna EM PROGRESSO.
    await expect(progressColumn).toContainText(cardTitle, { timeout: 10_000 });
  });
});
