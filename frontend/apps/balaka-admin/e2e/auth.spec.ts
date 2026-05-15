import { test, expect } from '@playwright/test';

test.describe('Admin Auth Persistence', () => {
  test('should remain logged in after page refresh', async ({ page }) => {
    // Mock the initial user fetch
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'admin@example.com',
          full_name: 'Admin User',
          is_active: true,
          is_superuser: true,
          roles: []
        }),
      });
    });

    // Set the token in localStorage
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-admin-token');
    });

    // Admin app usually runs on a different port or base path, 
    // but we'll assume it's accessible via baseURL or we can override it.
    // For now, let's assume we test it by going to /auth first or root.
    await page.goto('/');

    // Check if sidebar is visible (indicates logged in state in Admin)
    await expect(page.locator('aside')).toBeVisible();

    // Reload the page
    await page.reload();

    // Verify still logged in
    await expect(page.locator('aside')).toBeVisible();
    
    // Ensure localStorage still has the token
    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBe('fake-admin-token');
  });
});
