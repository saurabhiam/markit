import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    command: 'bun scripts/serve.cjs',
    cwd: path.join(__dirname),
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
