import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'results/benchmark-results.json' }]],
  use: {
    baseURL: 'http://localhost:3456',
    trace: 'off',
  },
  webServer: {
    command: 'npx serve public -l 3456 -s',
    port: 3456,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
