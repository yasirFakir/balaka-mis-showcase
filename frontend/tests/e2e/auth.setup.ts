import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('http://localhost:3001/auth');
  await page.fill('input[type="email"]', 'admin@airbalakatravel.com');
  await page.fill('input[type="password"]', 'AirBalaka@2026!#Secure');
  await page.click('button[type="submit"]');

  // Wait for the dashboard to confirm login success
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible({ timeout: 30000 });

  // Save storage state for all other tests
  await page.context().storageState({ path: authFile });
});
