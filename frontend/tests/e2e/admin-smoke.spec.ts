import { test, expect } from '@playwright/test';

const adminRoutes = [
  '/analytics',
  '/finance',
  '/finance/vendors',
  '/logistics/cargo',
  '/operations',
  '/requests',
  '/roles',
  '/services',
  '/staff',
  '/support',
  '/system/maintenance',
  '/users',
];

test.describe('Admin Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Skip real auth: Inject mock token
    await page.addInitScript(() => {
      window.localStorage.setItem('token', 'fake-admin-token');
    });

    // Mock API responses to avoid 401s and missing data errors
    await page.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      
      // User info
      if (url.includes('/users/me')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 1, email: 'admin@airbalakatravel.com', full_name: 'Mock Admin', 
            is_active: true, is_superuser: true, roles: []
          }),
        });
      }

      // Analytics Summary (Dashboard)
      if (url.includes('/analytics/summary')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_revenue: 0, total_cost: 0, net_profit: 0, total_debt: 0,
            pending_requests_count: 0, approved_requests_count: 0,
            processing_requests_count: 0, pending_verifications_count: 0,
            revenue_trend: [], revenue_by_service: [], debt_by_vendor: [], service_stats: []
          }),
        });
      }

      // Analytics Report (Detailed Page)
      if (url.includes('/analytics/report')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            month: 'January', year: '2026', internal_affairs_pnl: 0, external_affairs_pnl: 0,
            staff_performance: [], global_stats: { net_profit: 0, total_requests: 0, net_revenue: 0 }
          }),
        });
      }

      // Service list endpoints (often expect flat arrays in admin app)
      if (url.includes('/services/')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      }

      // Generic directory/list endpoints
      if (url.includes('skip=') || url.includes('/directory')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ items: [], total: 0 }),
        });
      }

      // Default: Return empty object or array based on common patterns
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });
  });

  for (const route of adminRoutes) {
    test(`should load ${route} without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          // Filter out SSE/CORS connection errors as they are often environmental in E2E
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
      
      // Use domcontentloaded instead of networkidle because SSE streams never "finish"
      await page.waitForLoadState('domcontentloaded');
      
      // Wait a bit for async data to render
      await page.waitForTimeout(2000);

      if (errors.length > 0) {
        console.error(`Errors on ${route}:`, errors);
      }
      
      expect(errors.length).toBe(0);
    });
  }
});
