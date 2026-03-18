import { test, expect } from '@playwright/test';

test.describe('Window Dragging CSS Verification', () => {
  test('verify drag and no-drag regions', async ({ page }) => {
    // Navigate to the dashboard
    await page.goto('http://127.0.0.1:5173/');
    
    // Take initial screenshot
    await page.screenshot({ path: 'tests/evidence/dashboard_initial.png' });

    // 1. Verify Root Container is Draggable
    // The DashboardPage root div has height: 100vh and WebkitAppRegion: drag
    const dashboardRoot = page.locator('#root > div').first();
    await expect(dashboardRoot).toHaveCSS('-webkit-app-region', 'drag');

    // 2. Verify Edge Overlays are Non-Draggable (Resize handles)
    // These are absolute positioned divs with z-index 9999 and thickness 5px
    // Top Edge
    const topEdge = page.locator('div[style*="top: 0"][style*="height: 5px"]').first();
    await expect(topEdge).toBeVisible();
    await expect(topEdge).toHaveCSS('-webkit-app-region', 'no-drag');

    // Bottom Edge
    const bottomEdge = page.locator('div[style*="bottom: 0"][style*="height: 5px"]').first();
    await expect(bottomEdge).toBeVisible();
    await expect(bottomEdge).toHaveCSS('-webkit-app-region', 'no-drag');
    
    // Left Edge
    const leftEdge = page.locator('div[style*="left: 0"][style*="width: 5px"]').first();
    await expect(leftEdge).toBeVisible();
    await expect(leftEdge).toHaveCSS('-webkit-app-region', 'no-drag');

    // Right Edge
    const rightEdge = page.locator('div[style*="right: 0"][style*="width: 5px"]').first();
    await expect(rightEdge).toBeVisible();
    await expect(rightEdge).toHaveCSS('-webkit-app-region', 'no-drag');

    // Take screenshot showing edge overlays (they are invisible but present, maybe inspect/highlight?)
    // We can't easily highlight them as they are transparent/overlay.
    
    // 3. Verify Interactive Elements are Non-Draggable
    
    // Primary Button "主动站立"
    const standButton = page.getByTestId('btn-stand-active').first();
    await expect(standButton).toBeVisible();
    await expect(standButton).toHaveCSS('-webkit-app-region', 'no-drag');

    // Header Buttons (e.g., Settings gear icon)
    // These are typically HeaderIconButton which have no-drag
    // We can find them by the svg icon name or just as buttons in the header
    const settingsButton = page.getByTestId('btn-settings').first();
    if (await settingsButton.isVisible()) {
        await expect(settingsButton).toHaveCSS('-webkit-app-region', 'no-drag');
    }

    // Take screenshot of interactive elements verification
    await page.screenshot({ path: 'tests/evidence/dashboard_drag_verified.png' });

    // 4. Verify Content Area (if distinguishable)
    // The requirement says "Dashboard is draggable from top bar AND blank content areas".
    // Since the root container is draggable, blank areas are draggable by default.
    // We just verified dashboardRoot is 'drag'.
    
    // 5. Verify Scrollable/Content lists are no-drag if they need interaction?
    // The code shows:
    // "content left blank to be draggable"
    // But specific interactive areas like the StatsDrawer content should handle their own events.
    // The StatsDrawer buttons (GhostButton) are verified to be no-drag.
    
    // Ghost Button "暂停"
    const pauseButton = page.getByTestId('btn-pause').first();
    if (await pauseButton.isVisible()) {
        await expect(pauseButton).toHaveCSS('-webkit-app-region', 'no-drag');
    }
  });
});
