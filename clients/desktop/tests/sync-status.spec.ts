import { test, expect } from '@playwright/test';

test.describe('Sync Status Indicator', () => {
  test('sync indicator element visible in dashboard', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/');
    await expect(page.locator('text=GetUp.ai')).toBeVisible({ timeout: 10000 });

    // SyncStatusIndicator renders a 26x26 div with a title attribute matching status labels
    // It appears in the header area (rendered twice: once in status bar, once in button group)
    // Look for the indicator by its characteristic styling: 26x26 rounded div with a span dot inside
    const syncIndicators = page.locator('div[title]').filter({
      has: page.locator('span'),
    }).filter({
      has: page.locator('style'),
    });

    // Alternative: find by the known title values from SyncStatusIndicator statusConfig
    // Possible titles: 'Synced', 'Syncing…', 'Sync error', 'Offline', 'Idle'
    const indicator = page.locator(
      'div[title="Synced"], div[title="Syncing…"], div[title="Sync error"], div[title="Offline"], div[title="Idle"]'
    ).first();
    await expect(indicator).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'tests/evidence/sync-indicator.png' });
  });

  test('sync indicator has dot element present', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/');
    await expect(page.locator('text=GetUp.ai')).toBeVisible({ timeout: 10000 });

    // Find the sync indicator by its title attribute
    const indicator = page.locator(
      'div[title="Synced"], div[title="Syncing…"], div[title="Sync error"], div[title="Offline"], div[title="Idle"]'
    ).first();
    await expect(indicator).toBeVisible({ timeout: 10000 });

    // The indicator should contain a span (the dot) with 8x8 size and border-radius 999
    const dot = indicator.locator('span').first();
    await expect(dot).toBeVisible();
    await expect(dot).toHaveCSS('width', '8px');
    await expect(dot).toHaveCSS('height', '8px');
    await expect(dot).toHaveCSS('border-radius', '999px');
  });
});
