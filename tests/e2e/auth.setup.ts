import { test as setup, expect } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), 'tests/.env.test') });

import { STORAGE_STATE } from '../../playwright.config';
import { supabaseAdmin } from '../fixtures/supabase';
import { USERS } from '../fixtures/users';

setup('authenticate', async ({ page }) => {
  const email = USERS.adminA.email;
  const password = USERS.adminA.password;

  // Garante que o usuário existe no DB de testes antes do UI tentar logar
  await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  }).catch(() => { /* ignora se já existir */ });

  await page.goto('/login');

  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  
  await page.click('button[type="submit"]');

  // Verify navigation to dashboard completed
  await expect(page.locator('h1, h2').filter({ hasText: 'Dashboard' }).first()).toBeVisible({ timeout: 15000 });

  // Save authentication state
  await page.context().storageState({ path: STORAGE_STATE });
});
