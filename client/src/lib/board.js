/** Pure helpers for the editable board. Keeps the hooks thin and testable. */

export const CELL_SIZE = 25;
export const CELL_SIZE_COMPACT = 19;
export const MIN_COLS = 10;
export const MAX_COLS = 90;
export const MIN_ROWS = 8;
export const MAX_ROWS = 40;

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const idOf = (row, col, cols) => row * cols + col;
export const rowOf = (id, cols) => Math.floor(id / cols);
export const colOf = (id, cols) => id % cols;

/** Default endpoints: a sixth in from each edge, vertically centred. */
export function defaultEndpoints(rows, cols) {
  const row = Math.floor(rows / 2);
  const inset = clamp(Math.round(cols / 6), 1, Math.floor(cols / 2) - 1);
  return {
    start: idOf(row, inset, cols),
    end: idOf(row, cols - 1 - inset, cols),
  };
}

/** Fits a grid to the measured container, honouring the min/max bounds. */
export function fitDimensions(width, height, compact) {
  const cell = compact ? CELL_SIZE_COMPACT : CELL_SIZE;
  const cols = clamp(Math.floor(width / cell), MIN_COLS, MAX_COLS);
  const rows = clamp(Math.floor(height / cell), MIN_ROWS, MAX_ROWS);
  return { rows, cols, cell };
}

/**
 * Re-projects a set of node ids from one grid size to another by preserving
 * (row, col) and dropping anything that no longer fits, so a window resize
 * does not wipe the board the user just drew.
 */
export function remapIds(ids, fromCols, toRows, toCols) {
  const next = new Set();
  for (const id of ids) {
    const row = Math.floor(id / fromCols);
    const col = id % fromCols;
    if (row < toRows && col < toCols) next.add(row * toCols + col);
  }
  return next;
}

export function remapEndpoint(id, fromCols, toRows, toCols, fallback) {
  const row = Math.floor(id / fromCols);
  const col = id % fromCols;
  if (row < toRows && col < toCols) return row * toCols + col;
  return fallback;
}

/** The transport shape the API and the shared solvers both expect. */
export function toPayload(board) {
  return {
    rows: board.rows,
    cols: board.cols,
    start: board.start,
    end: board.end,
    walls: [...board.walls],
    weights: [...board.weights],
    allowDiagonal: board.allowDiagonal,
  };
}

export const SPEEDS = [
  { id: 'contemplative', label: 'Slow', cellsPerSecond: 60 },
  { id: 'measured', label: 'Measured', cellsPerSecond: 220 },
  { id: 'brisk', label: 'Brisk', cellsPerSecond: 650 },
  { id: 'instant', label: 'Instant', cellsPerSecond: Infinity },
];

export const DEFAULT_SPEED = 'measured';
