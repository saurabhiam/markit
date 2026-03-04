import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

interface BenchResult {
  scenario: string;
  nodes: number;
  timeMs: number;
  matchCount: number;
}

const results: BenchResult[] = [];

async function waitForReady(page: Page) {
  await page.waitForFunction(() => (window as any).__benchReady === true, null, {
    timeout: 30000,
  });
}

async function injectMarkit(page: Page) {
  const coreDistPath = path.resolve(__dirname, '../../../packages/core/dist/index.js');
  const coreCode = fs.readFileSync(coreDistPath, 'utf-8');

  await page.evaluate((code) => {
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    return import(/* @vite-ignore */ url).then((mod) => {
      (window as any).__markit = mod.markit;
    });
  }, coreCode);

  await page.waitForFunction(() => typeof (window as any).__markit === 'function');
}

async function runBenchmark(
  page: Page,
  scenario: string,
  nodes: number,
  fn: string,
): Promise<BenchResult> {
  const result = await page.evaluate(
    ({ fn }) => {
      const markit = (window as any).__markit;
      const container = document.getElementById('content')!;
      const benchFn = new Function('markit', 'container', fn);

      performance.mark('bench-start');
      const matchCount = benchFn(markit, container);
      performance.mark('bench-end');

      const measure = performance.measure('bench', 'bench-start', 'bench-end');
      performance.clearMarks();
      performance.clearMeasures();

      return { timeMs: measure.duration, matchCount: matchCount || 0 };
    },
    { fn },
  );

  const benchResult: BenchResult = {
    scenario,
    nodes,
    timeMs: Math.round(result.timeMs * 100) / 100,
    matchCount: result.matchCount,
  };

  results.push(benchResult);
  console.log(
    `  ${scenario} (${nodes} nodes): ${benchResult.timeMs}ms, ${benchResult.matchCount} matches`,
  );

  return benchResult;
}

test.describe('Performance Benchmarks', () => {
  for (const nodeCount of [1000, 10000, 50000]) {
    test.describe(`${nodeCount} nodes`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto(`/bench.html?nodes=${nodeCount}`);
        await waitForReady(page);
        await injectMarkit(page);
      });

      test(`single keyword highlight (${nodeCount} nodes)`, async ({ page }) => {
        const result = await runBenchmark(
          page,
          'single-keyword',
          nodeCount,
          `
            const instance = markit(container);
            instance.mark('Lorem', { renderer: 'dom' });
            const count = instance.getMatches().length;
            instance.destroy();
            return count;
          `,
        );

        expect(result.matchCount).toBeGreaterThan(0);
        if (nodeCount <= 10000) {
          expect(result.timeMs).toBeLessThan(1000);
        }
      });

      test(`unmark after highlight (${nodeCount} nodes)`, async ({ page }) => {
        const result = await runBenchmark(
          page,
          'mark-then-unmark',
          nodeCount,
          `
            const instance = markit(container);
            instance.mark('Lorem', { renderer: 'dom' });
            const count = instance.getMatches().length;
            instance.unmark();
            instance.destroy();
            return count;
          `,
        );

        expect(result.matchCount).toBeGreaterThan(0);
      });

      if (nodeCount <= 10000) {
        test(`5 keywords simultaneously (${nodeCount} nodes)`, async ({ page }) => {
          const result = await runBenchmark(
            page,
            'multi-keyword-5',
            nodeCount,
            `
              const instance = markit(container);
              instance.mark(['Lorem', 'ipsum', 'dolor', 'amet', 'consectetur'], { renderer: 'dom' });
              const count = instance.getMatches().length;
              instance.destroy();
              return count;
            `,
          );

          expect(result.matchCount).toBeGreaterThan(0);
        });

        test(`regex search (${nodeCount} nodes)`, async ({ page }) => {
          const result = await runBenchmark(
            page,
            'regex-6plus-chars',
            nodeCount,
            `
              const instance = markit(container);
              instance.markRegExp(/\\b\\w{6,}\\b/g, { renderer: 'dom' });
              const count = instance.getMatches().length;
              instance.destroy();
              return count;
            `,
          );

          expect(result.matchCount).toBeGreaterThan(0);
        });
      }
    });
  }

  test('incremental search simulation (10K nodes)', async ({ page }) => {
    await page.goto('/bench.html?nodes=10000');
    await waitForReady(page);
    await injectMarkit(page);

    const result = await page.evaluate(() => {
      const markit = (window as any).__markit;
      const container = document.getElementById('content')!;
      const instance = markit(container);
      const terms = ['L', 'Lo', 'Lor', 'Lore', 'Lorem'];
      const timings: number[] = [];

      for (const term of terms) {
        const start = performance.now();
        instance.mark(term, { renderer: 'dom' });
        timings.push(performance.now() - start);
      }

      const matchCount = instance.getMatches().length;
      instance.destroy();

      return { timings, matchCount, totalMs: timings.reduce((a, b) => a + b, 0) };
    });

    console.log(
      `  incremental-search (10000 nodes): total=${Math.round(result.totalMs)}ms, steps=[${result.timings.map((t: number) => Math.round(t)).join(', ')}]ms`,
    );

    expect(result.matchCount).toBeGreaterThan(0);
  });

  test('100K nodes single keyword (stress test)', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto('/bench.html?nodes=100000');
    await waitForReady(page);
    await injectMarkit(page);

    const result = await runBenchmark(
      page,
      'single-keyword-100k',
      100000,
      `
        const instance = markit(container);
        instance.mark('Lorem', { renderer: 'dom' });
        const count = instance.getMatches().length;
        instance.destroy();
        return count;
      `,
    );

    expect(result.matchCount).toBeGreaterThan(0);
  });

  test.describe('Batched rendering', () => {
    for (const nodeCount of [10000, 50000]) {
      test(`batched highlight batchSize=500 (${nodeCount} nodes)`, async ({ page }) => {
        test.setTimeout(60000);
        await page.goto(`/bench.html?nodes=${nodeCount}`);
        await waitForReady(page);
        await injectMarkit(page);

        const result = await page.evaluate(
          async ({ nodes }) => {
            const markit = (window as any).__markit;
            const container = document.getElementById('content')!;
            const instance = markit(container);

            performance.mark('batch-start');

            const finished = new Promise<number>((resolve) => {
              instance.mark('Lorem', {
                renderer: 'dom',
                batchSize: 500,
                done: (count: number) => resolve(count),
              });
            });

            const matchCount = await finished;

            performance.mark('batch-end');
            const measure = performance.measure('batch', 'batch-start', 'batch-end');
            performance.clearMarks();
            performance.clearMeasures();

            instance.destroy();

            return {
              timeMs: measure.duration,
              matchCount,
              markElements: container.querySelectorAll('mark').length,
            };
          },
          { nodes: nodeCount },
        );

        console.log(
          `  batched-500 (${nodeCount} nodes): ${Math.round(result.timeMs * 100) / 100}ms, ${result.matchCount} matches, ${result.markElements} DOM marks`,
        );

        results.push({
          scenario: `batched-500`,
          nodes: nodeCount,
          timeMs: Math.round(result.timeMs * 100) / 100,
          matchCount: result.matchCount,
        });

        expect(result.matchCount).toBeGreaterThan(0);
        expect(result.markElements).toBe(result.matchCount);
      });
    }

    test('batched vs sync comparison (10K nodes)', async ({ page }) => {
      test.setTimeout(60000);
      await page.goto('/bench.html?nodes=10000');
      await waitForReady(page);
      await injectMarkit(page);

      const result = await page.evaluate(async () => {
        const markit = (window as any).__markit;
        const container = document.getElementById('content')!;

        // Sync run
        const syncInstance = markit(container);
        const syncStart = performance.now();
        syncInstance.mark('Lorem', { renderer: 'dom', batchSize: 0 });
        const syncTime = performance.now() - syncStart;
        const syncMatches = syncInstance.getMatches().length;
        syncInstance.destroy();

        // Batched run
        const batchInstance = markit(container);
        const batchStart = performance.now();

        const batchFinished = new Promise<number>((resolve) => {
          batchInstance.mark('Lorem', {
            renderer: 'dom',
            batchSize: 200,
            done: (count: number) => resolve(count),
          });
        });

        const batchMatches = await batchFinished;
        const batchTime = performance.now() - batchStart;
        batchInstance.destroy();

        return { syncTime, syncMatches, batchTime, batchMatches };
      });

      console.log(`  sync: ${Math.round(result.syncTime)}ms (${result.syncMatches} matches)`);
      console.log(
        `  batched-200: ${Math.round(result.batchTime)}ms (${result.batchMatches} matches)`,
      );

      results.push(
        {
          scenario: 'sync-baseline',
          nodes: 10000,
          timeMs: Math.round(result.syncTime * 100) / 100,
          matchCount: result.syncMatches,
        },
        {
          scenario: 'batched-200',
          nodes: 10000,
          timeMs: Math.round(result.batchTime * 100) / 100,
          matchCount: result.batchMatches,
        },
      );

      expect(result.syncMatches).toBe(result.batchMatches);
    });

    test('batched cancellation - rapid re-highlight (10K nodes)', async ({ page }) => {
      await page.goto('/bench.html?nodes=10000');
      await waitForReady(page);
      await injectMarkit(page);

      const result = await page.evaluate(async () => {
        const markit = (window as any).__markit;
        const container = document.getElementById('content')!;
        const instance = markit(container);

        // Rapidly call mark() 5 times to test cancellation
        const terms = ['L', 'Lo', 'Lor', 'Lore', 'Lorem'];
        for (const term of terms.slice(0, -1)) {
          instance.mark(term, { renderer: 'dom', batchSize: 100 });
        }

        // Only the last one should complete
        const finished = new Promise<number>((resolve) => {
          instance.mark('Lorem', {
            renderer: 'dom',
            batchSize: 100,
            done: (count: number) => resolve(count),
          });
        });

        const matchCount = await finished;
        const markElements = container.querySelectorAll('mark').length;
        instance.destroy();

        return { matchCount, markElements };
      });

      console.log(
        `  rapid-cancel (10K): ${result.matchCount} matches, ${result.markElements} DOM marks`,
      );

      expect(result.matchCount).toBeGreaterThan(0);
      expect(result.markElements).toBe(result.matchCount);
    });

    test('100K nodes batched (stress test)', async ({ page }) => {
      test.setTimeout(120000);
      await page.goto('/bench.html?nodes=100000');
      await waitForReady(page);
      await injectMarkit(page);

      const result = await page.evaluate(async () => {
        const markit = (window as any).__markit;
        const container = document.getElementById('content')!;
        const instance = markit(container);

        performance.mark('batch100k-start');

        const finished = new Promise<number>((resolve) => {
          instance.mark('Lorem', {
            renderer: 'dom',
            batchSize: 1000,
            done: (count: number) => resolve(count),
          });
        });

        const matchCount = await finished;

        performance.mark('batch100k-end');
        const measure = performance.measure('batch100k', 'batch100k-start', 'batch100k-end');
        performance.clearMarks();
        performance.clearMeasures();

        instance.destroy();
        return { timeMs: measure.duration, matchCount };
      });

      console.log(
        `  batched-1000 (100K nodes): ${Math.round(result.timeMs)}ms, ${result.matchCount} matches`,
      );

      results.push({
        scenario: 'batched-1000-100k',
        nodes: 100000,
        timeMs: Math.round(result.timeMs * 100) / 100,
        matchCount: result.matchCount,
      });

      expect(result.matchCount).toBeGreaterThan(0);
    });
  });

  test.afterAll(() => {
    if (results.length > 0) {
      console.log('\n=== Benchmark Summary ===');
      console.table(results);
    }
  });
});
