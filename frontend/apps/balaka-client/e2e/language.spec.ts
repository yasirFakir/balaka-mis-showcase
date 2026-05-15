import { test, expect } from '@playwright/test';

test.describe('Language Switching', () => {
  test('should switch from Bangla to English and back', async ({ page }) => {
    // Start at the root, which should default to bn
    await page.goto('/');
    
    // Check if the title is in Bangla
    await expect(page.locator('text=বলাকা ট্রাভেল')).toBeVisible();
    
    // The button to switch to English should say "EN"
    const langButton = page.locator('button:has-text("EN")');
    await expect(langButton).toBeVisible();
    
    // Switch to English
    await langButton.click();
    
    // URL should now contain /en/
    await expect(page).toHaveURL(/\/en/);
    
    // Check if the title is in English
    await expect(page.locator('text=Balaka Travel')).toBeVisible();
    
    // The button to switch back to Bangla should say "বাংলা"
    const bnButton = page.locator('button:has-text("বাংলা")');
    await expect(bnButton).toBeVisible();
    
    // Switch back to Bangla
    await bnButton.click();
    
    // URL should now contain /bn/
    await expect(page).toHaveURL(/\/bn/);
    await expect(page.locator('text=বলাকা ট্রাভেল')).toBeVisible();
  });
});
