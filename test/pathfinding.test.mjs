import test from 'node:test';
import assert from 'node:assert/strict';

import { normaliseGrid, GridError, WEIGHT_COST } from '../shared/grid.js';
import { solve, ALGORITHM_IDS, ALGORITHMS } from '../shared/algorithms.js';
import { generateMaze, MAZE_IDS } from '../shared/mazes.js';

const makeGrid = (overrides = {}) =>
  normaliseGrid({ rows: 15, cols: 25, start: 0, end: 15 * 25 - 1, ...overrides });

test('every advertised algorithm has a solver', () => {
  const grid = makeGrid();
  for (const id of ALGORITHM_IDS) {
    const result = solve(grid, id);
    assert.equal(result.algorithm, id);
    assert.ok(result.found, `${id} should find a path on an empty grid`);
  }
});

test('algorithm metadata is well formed', () => {
  for (const entry of ALGORITHMS) {
    assert.ok(entry.id && entry.name && entry.blurb);
    assert.ok(['informed', 'uninformed'].includes(entry.kind));
    assert.ok(['shortest', 'fewest-steps', 'none'].includes(entry.guarantee));
  }
});

test('paths are contiguous and run from start to end', () => {
  const grid = makeGrid({ walls: [30, 31, 32, 33, 55, 56, 80, 81] });
  for (const id of ALGORITHM_IDS) {
    const { path } = solve(grid, id);
    assert.equal(path[0], grid.start, `${id} path must begin at start`);
    assert.equal(path.at(-1), grid.end, `${id} path must end at end`);

    for (let i = 1; i < path.length; i += 1) {
      const dr = Math.abs(Math.floor(path[i] / grid.cols) - Math.floor(path[i - 1] / grid.cols));
      const dc = Math.abs((path[i] % grid.cols) - (path[i - 1] % grid.cols));
      assert.ok(dr <= 1 && dc <= 1 && dr + dc > 0, `${id} path step ${i} is not adjacent`);
    }

    for (const node of path) {
      assert.ok(!grid.walls.has(node), `${id} path crosses a wall`);
    }
  }
});

test('optimal solvers agree on shortest step count', () => {
  const grid = makeGrid({ walls: [30, 31, 32, 33, 55, 56, 80, 81] });
  const bfsLength = solve(grid, 'bfs').stats.pathLength;
  for (const id of ['dijkstra', 'astar', 'bidirectional']) {
    assert.equal(solve(grid, id).stats.pathLength, bfsLength, `${id} should match BFS length`);
  }
});

test('weighted solvers route around costly terrain, unweighted ones do not', () => {
  // A full column of weights except one cheap gap at the bottom row.
  const rows = 11;
  const cols = 21;
  const wallColumn = 10;
  const weights = [];
  for (let r = 0; r < rows - 1; r += 1) weights.push(r * cols + wallColumn);

  const grid = normaliseGrid({ rows, cols, start: 0, end: rows * cols - 1, weights });

  const astar = solve(grid, 'astar');
  const bfs = solve(grid, 'bfs');
  const crossings = (result) => result.path.filter((node) => grid.weights.has(node)).length;

  assert.ok(astar.found && bfs.found);
  assert.equal(crossings(astar), 0, 'A* should slip through the cheap gap');
  assert.equal(crossings(bfs), 1, 'BFS is blind to cost and should cross the weighted column');
  assert.ok(
    astar.stats.pathCost < bfs.stats.pathCost,
    'the weighted path must be strictly cheaper than the unweighted one',
  );
  assert.equal(
    astar.stats.pathLength,
    bfs.stats.pathLength,
    'both take the same number of steps; only the cost differs',
  );
  assert.equal(bfs.stats.pathCost - astar.stats.pathCost, WEIGHT_COST - 1);
});

test('A* settles no more nodes than Dijkstra', () => {
  const grid = makeGrid();
  const astar = solve(grid, 'astar');
  const dijkstra = solve(grid, 'dijkstra');
  assert.equal(astar.stats.pathCost, dijkstra.stats.pathCost);
  assert.ok(astar.stats.visited <= dijkstra.stats.visited);
});

test('an unreachable goal is reported, not thrown', () => {
  // Seal the end node into a pocket.
  const cols = 25;
  const rows = 15;
  const end = rows * cols - 1;
  const walls = [end - 1, end - cols, end - cols - 1];
  const grid = normaliseGrid({ rows, cols, start: 0, end, walls });

  for (const id of ALGORITHM_IDS) {
    const result = solve(grid, id);
    assert.equal(result.found, false, `${id} should report no path`);
    assert.deepEqual(result.path, []);
  }
});

test('diagonal movement produces shorter paths and refuses wall squeezes', () => {
  const plain = makeGrid();
  const diagonal = makeGrid({ allowDiagonal: true });
  assert.ok(solve(diagonal, 'astar').stats.pathLength < solve(plain, 'astar').stats.pathLength);

  // Corner at (1,1) is blocked by walls at (0,1) and (1,0): no diagonal escape.
  const cols = 5;
  const grid = normaliseGrid({
    rows: 5,
    cols,
    start: 0,
    end: 24,
    walls: [1, cols],
    allowDiagonal: true,
  });
  assert.equal(solve(grid, 'bfs').found, false, 'diagonal must not cut between two walls');
});

test('grid validation rejects malformed input', () => {
  assert.throws(() => normaliseGrid({ rows: 1, cols: 1, start: 0, end: 0 }), GridError);
  assert.throws(() => normaliseGrid({ rows: 5, cols: 5, start: 0, end: 0 }), GridError);
  assert.throws(() => normaliseGrid({ rows: 5, cols: 5, start: 0, end: 999 }), GridError);
  assert.throws(() => normaliseGrid({ rows: 300, cols: 300, start: 0, end: 5 }), GridError);
  assert.throws(() => normaliseGrid({ rows: 5, cols: 5, start: 0, end: 5, walls: 'nope' }), GridError);
  assert.throws(() => solve(makeGrid(), 'teleport'), GridError);
});

test('endpoints can never be walls or weights', () => {
  const grid = normaliseGrid({ rows: 5, cols: 5, start: 0, end: 24, walls: [0, 24, 7], weights: [0, 24, 7, 8] });
  assert.ok(!grid.walls.has(0) && !grid.walls.has(24));
  assert.ok(!grid.weights.has(0) && !grid.weights.has(24));
  assert.ok(grid.walls.has(7));
  assert.ok(!grid.weights.has(7), 'a wall may not also carry a weight');
  assert.ok(grid.weights.has(8));
});

test('maze generators are deterministic per seed and leave endpoints clear', () => {
  const options = { rows: 21, cols: 41, start: 0, end: 21 * 41 - 1, seed: 1234 };
  for (const type of MAZE_IDS) {
    const a = generateMaze(type, options);
    const b = generateMaze(type, options);
    assert.deepEqual(a.walls, b.walls, `${type} should be reproducible from its seed`);
    assert.equal(a.seed, 1234);
    assert.ok(!a.walls.includes(options.start) && !a.walls.includes(options.end));
    assert.ok(a.walls.every((id) => id >= 0 && id < options.rows * options.cols));
  }
});

test('recursive division and backtracker actually build structure', () => {
  const options = { rows: 21, cols: 41, start: 0, end: 21 * 41 - 1, seed: 7 };
  for (const type of ['recursive-division', 'backtracker']) {
    const maze = generateMaze(type, options);
    const ratio = maze.walls.length / (options.rows * options.cols);
    assert.ok(ratio > 0.1 && ratio < 0.8, `${type} wall density ${ratio} looks wrong`);
  }
});

test('a large grid solves within a sane budget', () => {
  const grid = normaliseGrid({ rows: 120, cols: 180, start: 0, end: 120 * 180 - 1 });
  const result = solve(grid, 'astar');
  assert.ok(result.found);
  assert.ok(result.stats.elapsedMs < 2000, `A* took ${result.stats.elapsedMs}ms`);
});
