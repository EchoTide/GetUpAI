import { test, expect } from '@playwright/test';

test.describe('Offline Mode', () => {
  test('offline banner appears when disconnected', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/');
    await expect(page.locator('text=GetUp.ai')).toBeVisible({ timeout: 10000 });

    // Banner should NOT be visible initially (online)
    await expect(page.locator('text=You\'re offline')).not.toBeVisible();

    // Go offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Offline banner message from i18n: "You're offline. AI features are unavailable. Data is saved locally."
    await expect(page.locator('text=You\'re offline')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'tests/evidence/offline-banner.png' });

    // Restore online state for cleanup
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });

  test('offline banner can be dismissed', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/');
    await expect(page.locator('text=GetUp.ai')).toBeVisible({ timeout: 10000 });

    // Go offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('text=You\'re offline')).toBeVisible({ timeout: 5000 });

    // Click the dismiss button (× character)
    const dismissBtn = page.locator('button[title="Dismiss"]');
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();

    // Banner should be gone
    await expect(page.locator('text=You\'re offline')).not.toBeVisible();

    // Restore online state for cleanup
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });

  test('offline banner reappears when going offline again after dismissal', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/');
    await expect(page.locator('text=GetUp.ai')).toBeVisible({ timeout: 10000 });

    // Go offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('text=You\'re offline')).toBeVisible({ timeout: 5000 });

    // Dismiss it
    await page.locator('button[title="Dismiss"]').click();
    await expect(page.locator('text=You\'re offline')).not.toBeVisible();

    // Come back online
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));

    // Go offline again — banner should reappear (dismissed state resets on new offline event)
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.locator('text=You\'re offline')).toBeVisible({ timeout: 5000 });

    // Cleanup
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });

  test('page still renders content when offline', async ({ page }) => {
    await page.goto('http://127.0.0.1:5173/');
    await expect(page.locator('text=GetUp.ai')).toBeVisible({ timeout: 10000 });

    // Go offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Dashboard content should still be visible (timer/stand button)
    await expect(page.getByTestId('btn-stand-active').first()).toBeVisible();
    // Status text still shown
    await expect(page.locator('text=GetUp.ai')).toBeVisible();

    // Cleanup
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });
});
