import { defineConfig, devices } from '@playwright/test';
const reportKind = process.env.PLAYWRIGHT_REPORT_KIND;
const reportSuffix = reportKind === 'legacy' || reportKind === 'policy' ? `-${reportKind}` : '';
export default defineConfig({
  testDir: './tests', timeout: 30_000, retries: 0,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: `results/playwright-report${reportSuffix}.json` }], ['html', { outputFolder: `results/html-report${reportSuffix}`, open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
    ...(process.env.CHROMIUM_PATH ? { launchOptions: { executablePath: process.env.CHROMIUM_PATH } } : {}),
  },
  webServer: { command: 'npm run dev -- --port 4173', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI, timeout: 60_000 },
});
