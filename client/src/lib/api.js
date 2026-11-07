import { normaliseGrid } from '@shared/grid.js';
import { solve, ALGORITHM_IDS, ALGORITHMS } from '@shared/algorithms.js';
import { generateMaze, MAZE_TYPES } from '@shared/mazes.js';

// Optional chaining keeps this module importable outside Vite, where
// `import.meta.env` does not exist — the render tests rely on that.
const BASE = import.meta.env?.VITE_API_BASE ?? '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Thin fetch wrapper. Distinguishes "the server said no" (an ApiError with a
 * status, which the UI should surface verbatim) from "the server is not there"
 * (a TypeError, which callers may answer with the offline fallback below).
 */
async function request(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(payload?.error?.message ?? `Request failed (${response.status})`, response.status);
  }

  return payload;
}

const isOffline = (error) => error instanceof TypeError || error.name === 'AbortError';

/* ------------------------------------------------------------------ */

export async function fetchCatalogue() {
  try {
    const data = await request('/algorithms');
    return { ...data, source: 'server' };
  } catch (error) {
    if (!isOffline(error)) throw error;
    return { algorithms: ALGORITHMS, mazes: MAZE_TYPES, source: 'local' };
  }
}

/**
 * Runs one algorithm, or all of them in compare mode.
 *
 * The server is the source of truth so the trace matches the reference
 * implementation exactly; if it is unreachable the identical shared module
 * runs in the browser instead, and the result is tagged so the UI can say so.
 */
export async function solveBoard(board, { compare = false, signal } = {}) {
  const payload = { ...board, compare, algorithm: board.algorithm };

  try {
    const data = await request('/solve', { method: 'POST', body: payload, signal });
    return { results: data.results, source: 'server' };
  } catch (error) {
    if (!isOffline(error)) throw error;
    const grid = normaliseGrid(board);
    const ids = compare ? ALGORITHM_IDS : [board.algorithm];
    return { results: ids.map((id) => solve(grid, id)), source: 'local' };
  }
}

export async function requestMaze({ type, rows, cols, start, end, seed, density }) {
  const body = { type, rows, cols, start, end, seed, density };

  try {
    const data = await request('/maze', { method: 'POST', body });
    return { ...data, source: 'server' };
  } catch (error) {
    if (!isOffline(error)) throw error;
    return { ...generateMaze(type, { rows, cols, start, end, seed, density }), source: 'local' };
  }
}

export const listScenarios = () => request('/scenarios').then((data) => data.scenarios);

export const loadScenario = (id) => request(`/scenarios/${id}`).then((data) => data.scenario);

export const saveScenario = (scenario) =>
  request('/scenarios', { method: 'POST', body: scenario }).then((data) => data.scenario);

export const deleteScenario = (id) => request(`/scenarios/${id}`, { method: 'DELETE' });

export const fetchStats = () => request('/stats');

export const fetchHealth = () => request('/health');
