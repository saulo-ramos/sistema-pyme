import { test, expect } from '@playwright/test';

// Este arquivo absorve os cookies de auth.setup.ts
test.describe('Navegação Autenticada', () => {
  
  test('deve carregar o Dashboard na raiz', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1, h2').filter({ hasText: 'Dashboard' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve carregar módulo de Clientes', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page.locator('h1, h2').filter({ hasText: 'Clientes' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve carregar módulo de Ventas', async ({ page }) => {
    await page.goto('/ventas');
    await expect(page.locator('h1, h2').filter({ hasText: 'Ventas' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve carregar módulo de Compras', async ({ page }) => {
    await page.goto('/compras');
    await expect(page.locator('h1, h2').filter({ hasText: 'Compras' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve carregar módulo de Honorarios', async ({ page }) => {
    await page.goto('/honorarios');
    await expect(page.locator('h1, h2').filter({ hasText: 'Honorarios' }).first()).toBeVisible({ timeout: 10000 });
  });

  test('deve carregar módulo de Remuneraciones', async ({ page }) => {
    await page.goto('/remuneraciones');
    await expect(page.locator('h1, h2').filter({ hasText: 'Remuneraciones' }).first()).toBeVisible({ timeout: 10000 });
  });
});
