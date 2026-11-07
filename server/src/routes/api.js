import { Router } from 'express';

import { normaliseGrid, GridError } from '../../../shared/grid.js';
import { ALGORITHMS, ALGORITHM_IDS, solve } from '../../../shared/algorithms.js';
import { MAZE_TYPES, MAZE_IDS, generateMaze } from '../../../shared/mazes.js';
import { asyncRoute, badRequest, notFound } from '../lib/errors.js';

/**
 * All application routes. The solver is the interesting one: the client sends a
 * board, the server replays the search and returns the full settle order so the
 * UI can animate a faithful trace rather than an approximation.
 */
export function createApiRouter({ store, logger }) {
  const router = Router();

  router.get(
    '/health',
    asyncRoute(async (req, res) => {
      res.json({
        status: 'ok',
        uptimeSeconds: Math.round(process.uptime()),
        version: process.env.APP_VERSION ?? 'dev',
        time: new Date().toISOString(),
      });
    }),
  );

  router.get('/algorithms', (req, res) => {
    res.json({ algorithms: ALGORITHMS, mazes: MAZE_TYPES });
  });

  router.post(
    '/solve',
    asyncRoute(async (req, res) => {
      const { algorithm, compare, ...rest } = req.body ?? {};
      const grid = toGrid(rest);

      const requested = compare ? ALGORITHM_IDS : [algorithm];
      for (const id of requested) {
        if (!ALGORITHM_IDS.includes(id)) {
          throw badRequest(`"${id}" is not a known algorithm`, { expected: ALGORITHM_IDS });
        }
      }

      const results = requested.map((id) => solve(grid, id));

      // Fire-and-forget: a stats write must never delay or fail a solve.
      Promise.all(
        results.map((result) =>
          store.recordRun({
            algorithm: result.algorithm,
            found: result.found,
            visited: result.stats.visited,
            pathLength: result.stats.pathLength,
            pathCost: result.stats.pathCost,
            elapsedMs: result.stats.elapsedMs,
            size: grid.size,
          }),
        ),
      ).catch((error) => logger.warn('failed to record run', { error: error.message }));

      res.json({
        grid: { rows: grid.rows, cols: grid.cols, start: grid.start, end: grid.end },
        results,
      });
    }),
  );

  router.post(
    '/maze',
    asyncRoute(async (req, res) => {
      const { type, seed, density, ...rest } = req.body ?? {};
      if (!MAZE_IDS.includes(type)) {
        throw badRequest(`"${type}" is not a known maze type`, { expected: MAZE_IDS });
      }

      // Endpoints matter here, but existing walls do not: a generator replaces them.
      const grid = toGrid({ ...rest, walls: [], weights: [] });
      const maze = generateMaze(type, {
        rows: grid.rows,
        cols: grid.cols,
        start: grid.start,
        end: grid.end,
        seed: Number.isFinite(Number(seed)) ? Number(seed) : undefined,
        density: clampDensity(density),
      });

      res.json(maze);
    }),
  );

  router.get(
    '/scenarios',
    asyncRoute(async (req, res) => {
      res.json({ scenarios: store.listScenarios() });
    }),
  );

  router.get(
    '/scenarios/:id',
    asyncRoute(async (req, res) => {
      const scenario = store.getScenario(req.params.id);
      if (!scenario) throw notFound('No scenario with that id');
      res.json({ scenario });
    }),
  );

  router.post(
    '/scenarios',
    asyncRoute(async (req, res) => {
      const { name, ...rest } = req.body ?? {};
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (trimmed.length < 1 || trimmed.length > 60) {
        throw badRequest('name must be between 1 and 60 characters');
      }

      const grid = toGrid(rest);
      const scenario = await store.saveScenario({
        name: trimmed,
        grid: {
          rows: grid.rows,
          cols: grid.cols,
          start: grid.start,
          end: grid.end,
          walls: [...grid.walls],
          weights: [...grid.weights],
          allowDiagonal: grid.allowDiagonal,
        },
      });

      logger.info('scenario saved', { id: scenario.id, name: scenario.name });
      res.status(201).json({ scenario });
    }),
  );

  router.delete(
    '/scenarios/:id',
    asyncRoute(async (req, res) => {
      const removed = await store.deleteScenario(req.params.id);
      if (!removed) throw notFound('No scenario with that id');
      res.status(204).end();
    }),
  );

  router.get(
    '/stats',
    asyncRoute(async (req, res) => {
      res.json(store.stats());
    }),
  );

  return router;
}

/** Translates shared-layer validation failures into HTTP 400s. */
function toGrid(raw) {
  try {
    return normaliseGrid(raw);
  } catch (error) {
    if (error instanceof GridError) throw badRequest(error.message);
    throw error;
  }
}

function clampDensity(value) {
  const density = Number(value);
  if (!Number.isFinite(density)) return undefined;
  return Math.min(0.45, Math.max(0.05, density));
}
