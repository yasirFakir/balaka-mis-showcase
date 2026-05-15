import { test as setup, expect } from '@playwright/test';

const authFile = 'playwright/.auth/client.json';

setup('authenticate as client', async ({ page }) => {
  await page.goto('http://localhost:3000/bn/auth');
  await page.fill('input[type="email"]', 'client@example.com');
  await page.fill('input[type="password"]', 'ClientBalaka@2026!#Pass');
  await page.click('button[type="submit"]');

  // Wait for the dashboard to confirm login success
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole('heading')).toBeVisible({ timeout: 30000 });

  // Save storage state for all other tests
  await page.context().storageState({ path: authFile });
});
