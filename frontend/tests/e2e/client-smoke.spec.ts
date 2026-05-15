import { test, expect } from '@playwright/test';

const clientRoutes = [
  '/bn/dashboard',
  '/bn/profile',
  '/bn/services',
  '/bn/support',
];

test.describe('Client Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Skip real auth: Inject mock token
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-client-token');
    });

    // Mock API responses
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/users/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 2, email: 'client@balaka.com', full_name: 'Mock Client',
            is_active: true, is_superuser: false, roles: [{ name: 'Client' }]
          }),
        });
      }

      // Client app often expects flat array for services
      if (url.includes('/services/')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }

      if (url.includes('skip=') || url.includes('/directory')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  });

  for (const route of clientRoutes) {
    test(`should load ${route} without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        // Debug logging for dashboard
        if (route.includes('dashboard')) {
            console.log(`[Browser Console] ${msg.text()}`);
        }

        if (msg.type() === 'error') {
          const text = msg.text();
          if (text.includes('events/?token=') || text.includes('Cross-Origin Request Blocked') || text.includes('Fetch error')) {
            return;
          }
          errors.push(text);
        }
      });
      page.on('pageerror', exception => {
        const text = exception.message;
        if (text.includes('events/?token=') || text.includes('Cross-Origin Request Blocked') || text.includes('Fetch error')) {
          return;
        }
        errors.push(text);
      });

      await page.goto(route);
      
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);

      if (errors.length > 0) {
        console.error(`Errors on ${route}:`, errors);
      }
      
      expect(errors.length).toBe(0);
    });
  }
});
