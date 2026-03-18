
import { test, expect } from '@playwright/test';

test.describe('Standing Popup Logic', () => {
  test('Verifies standing choices and state transitions', async ({ page }) => {
    // 1. Navigate to popup
    await page.goto('http://127.0.0.1:5173/#/popup');

    // Wait for the app to load
    await expect(page.getByTestId('popup-title')).toBeVisible();

    // Take screenshot of prompt
    await page.screenshot({ path: 'tests/evidence/1_prompt.png' });

    // 2. Trigger "Standing" mode
    // Usually the popup starts in "prompt" phase unless configured otherwise.
    // We expect "久坐超时" and buttons.
    // Click "我错了，这就站"
    await page.getByTestId('btn-admit-mistake').click();
    
    // Take screenshot of standing phase
    await page.screenshot({ path: 'tests/evidence/2_standing.png' });

    // 3. Verify we are in "standing" phase
    // Should see countdown timer or "保持站立"
    await expect(page.getByTestId('popup-title-standing')).toBeVisible();

    // Check localStorage state
    // We expect "mode" to be "standing" in the persisted store.
    let storeState = await page.evaluate(() => {
      const storage = localStorage.getItem('getup-ai-store-v2');
      return storage ? JSON.parse(storage) : null;
    });
    console.log('State after clicking Stand:', storeState?.state?.mode);
    expect(storeState.state.mode).toBe('standing');

    // 4. Click "我坐回去"
    await page.getByTestId('btn-sit-back').click();

    // Take screenshot of back to prompt
    await page.screenshot({ path: 'tests/evidence/3_back_to_prompt.png' });

    // 5. Verify we are back to prompt
    await expect(page.getByTestId('popup-title')).toBeVisible();
    await expect(page.getByTestId('popup-title-standing')).not.toBeVisible();

    // 6. Check localStorage state AGAIN
    // This is the CRITICAL CHECK for the potential bug.
    storeState = await page.evaluate(() => {
      const storage = localStorage.getItem('getup-ai-store-v2');
      return storage ? JSON.parse(storage) : null;
    });
    console.log('State after clicking Sit Back:', storeState?.state?.mode);

    // If bug exists, mode will be 'standing'. If fixed, it should be 'sitting'.
    // The plan says "Scenario: 坐回去路径仍可用".
    // If it's standing, it means the user is technically standing while looking at the prompt.
    // This seems wrong. The user clicked "Sit back", implying they stopped standing.
    
    // Let's assume for now we expect 'sitting'.
    // If it fails, I'll know I need to fix it.
    expect(storeState.state.mode).toBe('sitting'); 

    // 7. Verify "继续站着" closes popup (mocked)
    // First go back to standing
    await page.getByTestId('btn-admit-mistake').click();
    await expect(page.getByTestId('popup-title-standing')).toBeVisible();
    
    // Click "继续站着"
    // We need to mock window.electronAPI.closePopup to verify it's called
    await page.evaluate(() => {
        window.electronAPI = { 
            closePopup: () => { window._closePopupCalled = true; },
            send: () => {} 
        };
    });
    
    await page.getByTestId('btn-stand-continue').click();
    
    // Verify closePopup was called
    const closed = await page.evaluate(() => window._closePopupCalled);
    expect(closed).toBe(true);

    // 8. Verify "转为站立办公"
    // Reset state first? Or just continue.
    // If we clicked "Continue Standing", the popup closed but state is still 'standing'.
    // Let's reload page to reset UI or just trigger popup again?
    // Actually, if popup closes, we are done.
    
    // Let's reset for next test
    await page.reload();
    await page.getByTestId('btn-admit-mistake').click();
    await page.screenshot({ path: 'tests/evidence/4_standing_again.png' });
    
    await page.evaluate(() => {
        window.electronAPI = { 
            closePopup: () => { window._closePopupCalled = true; },
            send: () => {} 
        };
        window._closePopupCalled = false;
    });

    await page.getByTestId('btn-switch-work').click();
    
    const closedWork = await page.evaluate(() => window._closePopupCalled);
    expect(closedWork).toBe(true);
    
    // Verify state is 'standing_work'
    storeState = await page.evaluate(() => {
      const storage = localStorage.getItem('getup-ai-store-v2');
      return storage ? JSON.parse(storage) : null;
    });
    console.log('State after Switch to Work:', storeState?.state?.mode);
    expect(storeState.state.mode).toBe('standing_work');
    
    await page.screenshot({ path: 'tests/evidence/5_done.png' });
  });
});
