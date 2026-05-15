import { test, expect } from '@playwright/test';

test.describe('Auth Persistence', () => {
  test('should remain logged in after page refresh', async ({ page }) => {
    // Mock the initial user fetch
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'test@example.com',
          full_name: 'Test User',
          is_active: true,
          is_superuser: false,
          roles: []
        }),
      });
    });

    // Set the token in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-valid-token');
    });

    await page.goto('/');

    // Check if the user name is visible (assuming it's in the profile dropdown or similar)
    // Actually, in MainNav it shows the profile button if logged in
    await expect(page.locator('button.rounded-full')).toBeVisible();

    // Reload the page
    await page.reload();

    // Verify user is still logged in
    await expect(page.locator('button.rounded-full')).toBeVisible();
    
    // Ensure localStorage still has the token
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBe('fake-valid-token');
  });

  test('should remain logged in after language switch', async ({ page }) => {
    // Mock the initial user fetch
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'test@example.com',
          full_name: 'Test User',
          is_active: true,
          is_superuser: false,
          roles: []
        }),
      });
    });

    // Set the token in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-valid-token');
    });

    await page.goto('/');

    // Check if logged in
    await expect(page.locator('button.rounded-full')).toBeVisible();

    // Switch language
    const langButton = page.locator('button:has-text("EN")');
    await langButton.click();

    // Verify still logged in on English page
    await expect(page).toHaveURL(/\/en/);
    await expect(page.locator('button.rounded-full')).toBeVisible();
    
    // Switch back
    const bnButton = page.locator('button:has-text("বাংলা")');
    await bnButton.click();

    // Verify still logged in on Bangla page
    await expect(page).toHaveURL(/\/bn/);
    await expect(page.locator('button.rounded-full')).toBeVisible();
  });

  test('should logout when session expires (401)', async ({ page }) => {
    // Mock the user fetch to return 401
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'SESSION_EXPIRED' }),
      });
    });

    // Set the token in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'expired-token');
    });

    await page.goto('/');

    // Should be redirected to auth or show login button
    await expect(page.locator('text=Login')).toBeVisible();
    
    // Ensure token is removed
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBeNull();
  });
});
