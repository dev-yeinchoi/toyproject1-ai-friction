import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

test('Figure 1: 4 UI condition screenshots, same viewport and evidence fixture', async ({page}) => {
  mkdirSync(join(process.cwd(),'results','screenshots'),{recursive:true});
  for (const ui of ['U1','U2','U3','U4']) {
    await page.goto(`/?ui=${ui}&evidence=E2`);
    await expect(page.getByTestId('screen-S0')).toBeVisible();
    await page.screenshot({path:join(process.cwd(),'results','screenshots',`${ui}.png`),fullPage:true});
  }
});
