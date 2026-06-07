import { test, expect } from '@playwright/test';
import { USERS } from '../fixtures/users';


// Reset storage state for this file to avoid using the auth.setup cookies
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Autenticação Login', () => {
  test('deve mostrar erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'hacker@shadow.com');
    await page.fill('input[type="password"]', 'senha super maluca 123');
    await page.click('button[type="submit"]');

    // Espera até que a mensagem de erro da interface (Toast ou form) fique visível
    // Usamos .first() para evitar violação de strict mode com elementos de acessibilidade (aria-live)
    await expect(page.getByText(/Email o contraseña incorrectos/i).first()).toBeVisible({ timeout: 10000 });

  });

  test('deve redirecionar o usuário para o dashboard raiz em caso de sucesso', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', USERS.adminA.email);
    await page.fill('input[type="password"]', USERS.adminA.password);
    await page.click('button[type="submit"]');


    await expect(page.locator('h1, h2').filter({ hasText: 'Dashboard' }).first()).toBeVisible({ timeout: 15000 });
  });
});
