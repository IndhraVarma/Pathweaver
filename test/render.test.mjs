import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Server-renders the real components so a crash on first paint fails the
 * suite. esbuild (already present via Vite) compiles the JSX; nothing here
 * needs a browser.
 */
let markup;
let workDir;

before(async () => {
  const { build } = await import('esbuild');
  // The bundle must sit inside the project so Node resolves the externalised
  // react-dom from the workspace's own node_modules.
  const cacheRoot = path.resolve(import.meta.dirname, '../node_modules/.cache');
  await fs.mkdir(cacheRoot, { recursive: true });
  workDir = await fs.mkdtemp(path.join(cacheRoot, 'pathweaver-render-'));
  const outfile = path.join(workDir, 'entry.mjs');

  await build({
    entryPoints: [path.join(import.meta.dirname, 'render-entry.jsx')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'automatic',
    // Mirrors the '@shared' alias in client/vite.config.js.
    alias: { '@shared': path.resolve(import.meta.dirname, '../shared') },
    external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
    logLevel: 'silent',
  });

  const module = await import(pathToFileURL(outfile).href);
  markup = module.render();
});

after(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

test('every section renders without throwing', () => {
  for (const [name, html] of Object.entries(markup)) {
    assert.ok(typeof html === 'string' && html.length > 0, `${name} rendered nothing`);
  }
});

test('the hero carries its headline, kicker and controls', () => {
  assert.match(markup.hero, /Find the way/);
  assert.match(markup.hero, /beautifully/);
  assert.match(markup.hero, /Six algorithms\. One grid\./);
  assert.match(markup.hero, /Enter the grid/);
  assert.match(markup.hero, /Scroll to discover/);
  assert.match(markup.hero, /01 — 05/);

  // The orbital object and its three rings.
  assert.match(markup.hero, /orbital__core/);
  assert.equal((markup.hero.match(/orbital__torus/g) ?? []).length, 3);
  assert.match(markup.hero, /orbital__plinth/);
});

test('the header carries the wordmark and navigation', () => {
  assert.match(markup.header, /PATHWEAVER/);
  assert.match(markup.header, /The grid/);
  assert.match(markup.header, /Algorithms/);
  assert.match(markup.header, /Benchmarks/);
  assert.match(markup.header, /Start a search/);
});

test('the visualizer renders a full grid of cells with endpoints', () => {
  const cells = markup.visualizer.match(/class="cell cell--\w+"/g) ?? [];
  assert.ok(cells.length > 100, `expected a grid of cells, found ${cells.length}`);

  assert.equal((markup.visualizer.match(/cell--start/g) ?? []).length, 1);
  assert.equal((markup.visualizer.match(/cell--end/g) ?? []).length, 1);

  // Controls, legend and the empty-state hint.
  assert.match(markup.visualizer, /Visualise search/);
  assert.match(markup.visualizer, /Race all six/);
  assert.match(markup.visualizer, /Clear board/);
  assert.match(markup.visualizer, /Diagonals/);
  assert.match(markup.visualizer, /Weighted ground/);
  assert.match(markup.visualizer, /hold shift for weighted ground/);
  assert.match(markup.visualizer, /Saved boards/);
});

test('the grid is labelled for assistive technology', () => {
  assert.match(markup.visualizer, /role="group"/);
  assert.match(markup.visualizer, /aria-label="Pathfinding grid/);
  assert.match(markup.visualizer, /role="progressbar"/);
});

test('every algorithm and maze type appears in the cast', () => {
  for (const name of ['A* Search', 'Dijkstra', 'Greedy Best-First', 'Breadth-First', 'Depth-First', 'Bidirectional BFS']) {
    assert.ok(markup.algorithms.includes(name), `${name} is missing from the cast`);
  }
  for (const name of ['Recursive Division', 'Recursive Backtracker', 'Scatter', 'Weighted Terrain']) {
    assert.ok(markup.algorithms.includes(name), `${name} is missing from the generators`);
  }
});

test('race results rank by cells searched and flag the cheapest route', () => {
  assert.match(markup.race, /Race results/);
  assert.match(markup.race, /optimal/);
  assert.match(markup.race, /Cheapest route/);

  // A* searched the fewest cells, so it should be listed first.
  const astarAt = markup.race.indexOf('A* Search');
  const bfsAt = markup.race.indexOf('Breadth-First');
  assert.ok(astarAt > -1 && bfsAt > -1 && astarAt < bfsAt);

  // The failed run is marked rather than silently dropped.
  assert.match(markup.race, /race__row--failed/);
});

test('the footer reports service health', () => {
  assert.match(markup.footer, /dot--up/);
  assert.match(markup.footer, /Version 1\.0\.0/);
  assert.match(markup.footer, /Shift-drag for weighted ground/);
});
