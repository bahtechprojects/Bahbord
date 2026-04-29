import { test, expect } from '@playwright/test';

/**
 * Fluxo crítico #3 — Criar comentário em um ticket.
 *
 * TODO(setup): definir E2E_BOARD_ID; opcionalmente E2E_TICKET_ID
 * para testar contra um ticket específico (mais estável que pegar o primeiro).
 */
const BOARD_ID = process.env.E2E_BOARD_ID ?? 'REPLACE_WITH_REAL_BOARD_ID';
const TICKET_ID = process.env.E2E_TICKET_ID;

test.describe('Criar comentário', () => {
  test.skip(
    BOARD_ID === 'REPLACE_WITH_REAL_BOARD_ID',
    'Defina E2E_BOARD_ID no .env.local com um board UUID válido.'
  );

  test('abrir ticket, escrever comentário e ver na lista', async ({ page }) => {
    if (TICKET_ID) {
      await page.goto(`/ticket/${TICKET_ID}`);
    } else {
      await page.goto(`/board?board_id=${BOARD_ID}`);
      // Abre o primeiro card. TODO: trocar por um seletor mais estável
      // (ex: data-ticket-id) quando o componente expor o atributo.
      const firstCard = page
        .locator('[data-ticket-id], article, [role="button"]')
        .first();
      await expect(firstCard).toBeVisible();
      await firstCard.click();
    }

    // Aguarda o input de comentário (placeholder visto em TicketComments.tsx).
    const commentInput = page.getByPlaceholder(/escreva um comentário/i);
    await expect(commentInput).toBeVisible({ timeout: 10_000 });

    const text = `Teste comentário ${Date.now()}`;
    await commentInput.fill(text);

    // Submete: tenta Enter primeiro (form submit padrão), com fallback no botão.
    await commentInput.press('Enter');

    // Fallback caso o Enter não submeta o form.
    const submitBtn = page.getByRole('button', { name: /enviar|comentar|publicar|salvar/i });
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
    }

    // Verifica que o comentário aparece na lista.
    await expect(page.getByText(text, { exact: false })).toBeVisible({ timeout: 10_000 });
  });
});
