import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createApp } from '../server/src/app.js';
import { loadConfig } from '../server/src/config.js';
import { JsonStore } from '../server/src/lib/store.js';

let server;
let base;
let dataFile;

const api = (route, options) => fetch(`${base}${route}`, options);

const json = (route, body, method = 'POST') =>
  api(route, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const board = (overrides = {}) => ({
  rows: 12,
  cols: 20,
  start: 0,
  end: 239,
  walls: [],
  weights: [],
  ...overrides,
});

before(async () => {
  dataFile = path.join(await fs.mkdtemp(path.join(os.tmpdir(), 'pathweaver-')), 'store.json');

  const config = { ...loadConfig({ NODE_ENV: 'test' }), dataFile };
  const store = await new JsonStore({ file: dataFile }).init();
  const silent = { debug() {}, info() {}, warn() {}, error() {} };

  const app = createApp({ store, logger: silent, config });
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(path.dirname(dataFile), { recursive: true, force: true });
});

test('GET /api/health reports ok', async () => {
  const response = await api('/api/health');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, 'ok');
  assert.ok(typeof body.uptimeSeconds === 'number');
});

test('GET /api/algorithms lists the catalogue', async () => {
  const body = await api('/api/algorithms').then((r) => r.json());
  assert.equal(body.algorithms.length, 6);
  assert.equal(body.mazes.length, 4);
  assert.ok(body.algorithms.every((entry) => entry.id && entry.blurb));
});

test('POST /api/solve returns a usable trace', async () => {
  const response = await json('/api/solve', { ...board(), algorithm: 'astar' });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.results.length, 1);

  const [result] = body.results;
  assert.equal(result.algorithm, 'astar');
  assert.ok(result.found);
  assert.equal(result.path.at(0), 0);
  assert.equal(result.path.at(-1), 239);
  assert.ok(result.visitedOrder.length > 0);
  assert.ok(result.stats.elapsedMs >= 0);
});

test('POST /api/solve honours compare mode', async () => {
  const body = await json('/api/solve', { ...board(), compare: true }).then((r) => r.json());
  assert.equal(body.results.length, 6);
  const ids = new Set(body.results.map((entry) => entry.algorithm));
  assert.equal(ids.size, 6);
});

test('POST /api/solve rejects bad input with a clear message', async () => {
  const unknown = await json('/api/solve', { ...board(), algorithm: 'wormhole' });
  assert.equal(unknown.status, 400);
  const body = await unknown.json();
  assert.match(body.error.message, /not a known algorithm/);
  assert.ok(Array.isArray(body.error.details.expected));

  const malformed = await json('/api/solve', { rows: 2, cols: 2, start: 0, end: 0, algorithm: 'bfs' });
  assert.equal(malformed.status, 400);

  const oversized = await json('/api/solve', { rows: 500, cols: 500, start: 0, end: 10, algorithm: 'bfs' });
  assert.equal(oversized.status, 400);
});

test('POST /api/maze generates a board and respects its seed', async () => {
  const payload = { ...board(), type: 'recursive-division', seed: 99 };
  const first = await json('/api/maze', payload).then((r) => r.json());
  const second = await json('/api/maze', payload).then((r) => r.json());

  assert.deepEqual(first.walls, second.walls);
  assert.ok(first.walls.length > 0);
  assert.ok(!first.walls.includes(0) && !first.walls.includes(239));

  const bad = await json('/api/maze', { ...board(), type: 'labyrinth' });
  assert.equal(bad.status, 400);
});

test('scenarios round-trip through the API', async () => {
  const created = await json('/api/scenarios', { name: '  Spiral  ', ...board({ walls: [5, 6, 7] }) });
  assert.equal(created.status, 201);

  const { scenario } = await created.json();
  assert.equal(scenario.name, 'Spiral', 'the name should be trimmed');
  assert.deepEqual(scenario.grid.walls, [5, 6, 7]);

  const list = await api('/api/scenarios').then((r) => r.json());
  assert.ok(list.scenarios.some((entry) => entry.id === scenario.id));
  assert.equal(list.scenarios.find((entry) => entry.id === scenario.id).wallCount, 3);

  const fetched = await api(`/api/scenarios/${scenario.id}`).then((r) => r.json());
  assert.equal(fetched.scenario.name, 'Spiral');

  const removed = await api(`/api/scenarios/${scenario.id}`, { method: 'DELETE' });
  assert.equal(removed.status, 204);

  const gone = await api(`/api/scenarios/${scenario.id}`);
  assert.equal(gone.status, 404);
});

test('scenario names are validated', async () => {
  assert.equal((await json('/api/scenarios', { name: '   ', ...board() })).status, 400);
  assert.equal((await json('/api/scenarios', { name: 'x'.repeat(61), ...board() })).status, 400);
  assert.equal((await json('/api/scenarios', { name: 'ok', rows: 1, cols: 1, start: 0, end: 0 })).status, 400);
});

test('saved scenarios survive a restart', async () => {
  const { scenario } = await json('/api/scenarios', { name: 'Persisted', ...board() }).then((r) => r.json());

  // A second store over the same file stands in for a process restart.
  const reopened = await new JsonStore({ file: dataFile }).init();
  assert.ok(reopened.listScenarios().some((entry) => entry.id === scenario.id));
});

test('GET /api/stats aggregates the runs that were served', async () => {
  const body = await api('/api/stats').then((r) => r.json());
  assert.ok(body.totalRuns > 0);
  assert.ok(body.algorithms.length > 0);

  const astar = body.algorithms.find((entry) => entry.algorithm === 'astar');
  assert.ok(astar.runs > 0);
  assert.ok(astar.solveRate >= 0 && astar.solveRate <= 1);
  assert.ok(astar.avgVisited > 0);
});

test('unknown API routes return a 404 in the standard error shape', async () => {
  const response = await api('/api/nowhere');
  assert.equal(response.status, 404);
  const body = await response.json();
  assert.equal(body.error.status, 404);
  assert.match(body.error.message, /No API route/);
});

test('rate limit headers are present on API responses', async () => {
  const response = await api('/api/health');
  assert.ok(response.headers.get('ratelimit-limit'));
  assert.ok(response.headers.get('ratelimit-remaining'));
});

test('the limiter rejects a burst with 429 and a Retry-After', async () => {
  const { createApp: build } = await import('../server/src/app.js');
  const config = { ...loadConfig({ NODE_ENV: 'test' }), rateLimit: { windowMs: 60_000, max: 3 } };
  const store = await new JsonStore({ file: dataFile }).init();
  const silent = { debug() {}, info() {}, warn() {}, error() {} };

  const burstServer = build({ store, logger: silent, config }).listen(0);
  await new Promise((resolve) => burstServer.once('listening', resolve));
  const burstBase = `http://127.0.0.1:${burstServer.address().port}`;

  try {
    const statuses = [];
    for (let i = 0; i < 5; i += 1) {
      statuses.push((await fetch(`${burstBase}/api/health`)).status);
    }
    assert.deepEqual(statuses.slice(0, 3), [200, 200, 200]);
    assert.equal(statuses[3], 429);

    const blocked = await fetch(`${burstBase}/api/health`);
    assert.ok(blocked.headers.get('retry-after'));
  } finally {
    await new Promise((resolve) => burstServer.close(resolve));
  }
});
