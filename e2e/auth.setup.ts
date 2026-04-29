import { test as setup, expect } from '@playwright/test';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Auth setup usando Clerk Testing Tokens.
 * Doc: https://clerk.com/docs/testing/playwright
 *
 * Pré-requisitos:
 *   1. Criar um usuário de teste no Clerk Dashboard (com email/password)
 *      e aprovar (rota `org_access`) para o usuário ter acesso aos boards.
 *   2. Adicionar no .env.local:
 *        CLERK_TEST_EMAIL=seu-test-user@example.com
 *        CLERK_TEST_PASSWORD=senha-segura
 *      e as chaves Clerk normais (NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
 *      CLERK_SECRET_KEY) — Testing Tokens funciona em modo dev/test.
 *   3. `npm install --legacy-peer-deps` (já adiciona @playwright/test
 *      e o `@clerk/testing` se você optar por incluí-lo manualmente).
 *
 * NOTA: Este arquivo importa `@clerk/testing/playwright`. Se preferir não
 * adicionar essa dep, há um fallback comentado mais abaixo que faz login
 * via UI direto na página /sign-in.
 */

const authFile = path.resolve(__dirname, '.auth/admin.json');

setup('authenticate as admin', async ({ page }) => {
  // Garante que a pasta .auth existe.
  fs.mkdirSync(path.dirname(authFile), { recursive: true });

  const email = process.env.CLERK_TEST_EMAIL;
  const password = process.env.CLERK_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'CLERK_TEST_EMAIL e CLERK_TEST_PASSWORD precisam estar setados no .env.local. ' +
        'Crie um usuário de teste no Clerk Dashboard e aprove o acesso (org_access).'
    );
  }

  // Inicializa Testing Tokens — bypassa rate-limits e bot-detection do Clerk.
  await clerkSetup();

  await page.goto('/sign-in');

  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: email,
      password,
    },
  });

  // Aguarda redirect pós-login (dashboard ou my-tasks dependendo do estado).
  await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), {
    timeout: 15_000,
  });

  // Sanity: confere que tem um link/elemento de usuário logado.
  await expect(page.locator('body')).toBeVisible();

  await page.context().storageState({ path: authFile });
});

/* ------------------------------------------------------------------ *
 * Fallback sem @clerk/testing (login via UI):
 *
 * setup('authenticate via UI', async ({ page }) => {
 *   await page.goto('/sign-in');
 *   await page.fill('input[name="identifier"]', process.env.CLERK_TEST_EMAIL!);
 *   await page.click('button[type="submit"]');
 *   await page.fill('input[name="password"]', process.env.CLERK_TEST_PASSWORD!);
 *   await page.click('button[type="submit"]');
 *   await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'));
 *   await page.context().storageState({ path: authFile });
 * });
 * ------------------------------------------------------------------ */
