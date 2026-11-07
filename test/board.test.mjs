import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_COLS,
  MIN_COLS,
  MIN_ROWS,
  defaultEndpoints,
  fitDimensions,
  remapEndpoint,
  remapIds,
  toPayload,
} from '../client/src/lib/board.js';
import { normaliseGrid } from '../shared/grid.js';
import { solve } from '../shared/algorithms.js';

test('default endpoints sit apart, inside the grid, on the same row', () => {
  for (const [rows, cols] of [
    [10, 10],
    [21, 51],
    [8, 90],
  ]) {
    const { start, end } = defaultEndpoints(rows, cols);
    assert.notEqual(start, end);
    assert.ok(start >= 0 && start < rows * cols);
    assert.ok(end >= 0 && end < rows * cols);
    assert.equal(Math.floor(start / cols), Math.floor(end / cols));
    assert.ok(start % cols < end % cols, 'start should sit to the left of the goal');
  }
});

test('dimensions are clamped to the supported range', () => {
  const tiny = fitDimensions(40, 40, false);
  assert.equal(tiny.cols, MIN_COLS);
  assert.equal(tiny.rows, MIN_ROWS);

  const huge = fitDimensions(100000, 100000, false);
  assert.equal(huge.cols, MAX_COLS);

  assert.ok(fitDimensions(800, 600, true).cols > fitDimensions(800, 600, false).cols);
});

test('obstacles keep their position when the grid is resized', () => {
  // Three cells on row 2 of a 10-wide grid.
  const ids = new Set([20, 21, 22]);
  const widened = remapIds(ids, 10, 10, 20);
  assert.deepEqual([...widened].sort((a, b) => a - b), [40, 41, 42]);

  for (const id of widened) {
    assert.equal(Math.floor(id / 20), 2, 'the row should be preserved');
  }

  // Cells that fall outside the new bounds are dropped, not wrapped.
  const narrowed = remapIds(new Set([9, 19]), 10, 10, 5);
  assert.equal(narrowed.size, 0);
});

test('endpoints fall back when they no longer fit', () => {
  assert.equal(remapEndpoint(55, 10, 10, 20, 7), 100 + 5);
  assert.equal(remapEndpoint(99, 10, 3, 5, 7), 7, 'out of bounds should use the fallback');
});

test('toPayload produces something the solver accepts', () => {
  const board = {
    rows: 12,
    cols: 20,
    start: 0,
    end: 239,
    walls: new Set([5, 6]),
    weights: new Set([7]),
    allowDiagonal: true,
  };

  const payload = toPayload(board);
  assert.deepEqual(payload.walls, [5, 6]);
  assert.deepEqual(payload.weights, [7]);
  assert.equal(payload.allowDiagonal, true);

  const result = solve(normaliseGrid(payload), 'astar');
  assert.ok(result.found);
});
