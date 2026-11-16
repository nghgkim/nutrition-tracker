import { test } from '@playwright/test';

test('screenshot', async ({ page }) => {
  await page.goto('http://localhost:3000/foods');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/tmp/opencode/foods.png', fullPage: true });
  console.log('done');
});
