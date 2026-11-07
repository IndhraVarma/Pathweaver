/**
 * Grid model shared by the client and the API server.
 *
 * A grid is described in a transport-friendly, flat form:
 *   { rows, cols, walls: number[], weights: number[], start: number, end: number }
 * where every node is addressed by its index `id = row * cols + col`.
 */

export const WEIGHT_COST = 8;
export const BASE_COST = 1;

/** Orthogonal neighbours, in a stable N/E/S/W order. */
const ORTHOGONAL = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

/** Diagonal neighbours, appended when diagonal movement is enabled. */
const DIAGONAL = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
];

export function toId(row, col, cols) {
  return row * cols + col;
}

export function toCoord(id, cols) {
  return { row: Math.floor(id / cols), col: id % cols };
}

export function inBounds(row, col, rows, cols) {
  return row >= 0 && row < rows && col >= 0 && col < cols;
}

/**
 * Normalises raw (possibly untrusted) grid input into a validated internal
 * shape with O(1) wall/weight lookups. Throws on anything inconsistent.
 */
export function normaliseGrid(raw) {
  const rows = Number(raw?.rows);
  const cols = Number(raw?.cols);

  if (!Number.isInteger(rows) || !Number.isInteger(cols)) {
    throw new GridError('rows and cols must be integers');
  }
  if (rows < 2 || cols < 2) {
    throw new GridError('grid must be at least 2x2');
  }
  if (rows > 200 || cols > 200) {
    throw new GridError('grid may not exceed 200x200');
  }

  const size = rows * cols;
  const validId = (value, label) => {
    const id = Number(value);
    if (!Number.isInteger(id) || id < 0 || id >= size) {
      throw new GridError(`${label} must be a node index between 0 and ${size - 1}`);
    }
    return id;
  };

  const start = validId(raw.start, 'start');
  const end = validId(raw.end, 'end');
  if (start === end) {
    throw new GridError('start and end must be different nodes');
  }

  const walls = new Set();
  for (const value of toArray(raw.walls, 'walls', size)) {
    const id = validId(value, 'walls entry');
    if (id !== start && id !== end) walls.add(id);
  }

  const weights = new Set();
  for (const value of toArray(raw.weights, 'weights', size)) {
    const id = validId(value, 'weights entry');
    if (id !== start && id !== end && !walls.has(id)) weights.add(id);
  }

  return {
    rows,
    cols,
    size,
    start,
    end,
    walls,
    weights,
    allowDiagonal: Boolean(raw.allowDiagonal),
  };
}

function toArray(value, label, size) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new GridError(`${label} must be an array`);
  if (value.length > size) throw new GridError(`${label} has more entries than the grid has nodes`);
  return value;
}

/** Returns the walkable neighbours of `id` as `{ id, cost }` records. */
export function neighboursOf(grid, id) {
  const { rows, cols } = grid;
  const row = Math.floor(id / cols);
  const col = id % cols;
  const offsets = grid.allowDiagonal ? ORTHOGONAL.concat(DIAGONAL) : ORTHOGONAL;
  const result = [];

  for (const [dr, dc] of offsets) {
    const r = row + dr;
    const c = col + dc;
    if (!inBounds(r, c, rows, cols)) continue;

    const next = r * cols + c;
    if (grid.walls.has(next)) continue;

    // Disallow squeezing diagonally between two walls.
    if (dr !== 0 && dc !== 0) {
      if (grid.walls.has(row * cols + c) && grid.walls.has(r * cols + col)) continue;
    }

    result.push({ id: next, cost: costOf(grid, next, dr !== 0 && dc !== 0) });
  }

  return result;
}

export function costOf(grid, id, diagonal = false) {
  const base = grid.weights.has(id) ? WEIGHT_COST : BASE_COST;
  return diagonal ? base * Math.SQRT2 : base;
}

export class GridError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GridError';
    this.status = 400;
  }
}
