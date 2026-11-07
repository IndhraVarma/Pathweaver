import { useCallback, useMemo, useState } from 'react';

import { defaultEndpoints, remapEndpoint, remapIds } from '../lib/board.js';

/**
 * Owns the editable board: dimensions, obstacles, terrain and endpoints.
 *
 * Walls and weights are mutually exclusive by construction — painting one
 * clears the other — which keeps the rendering and the solver in agreement
 * without either having to special-case the overlap.
 */
export function useBoard(initial = { rows: 21, cols: 51 }) {
  const [state, setState] = useState(() => {
    const { rows, cols } = initial;
    const { start, end } = defaultEndpoints(rows, cols);
    return {
      rows,
      cols,
      start,
      end,
      walls: new Set(),
      weights: new Set(),
      allowDiagonal: false,
    };
  });

  const resize = useCallback((rows, cols) => {
    setState((prev) => {
      if (prev.rows === rows && prev.cols === cols) return prev;

      const fallback = defaultEndpoints(rows, cols);
      const start = remapEndpoint(prev.start, prev.cols, rows, cols, fallback.start);
      let end = remapEndpoint(prev.end, prev.cols, rows, cols, fallback.end);
      if (end === start) end = fallback.end === start ? fallback.start : fallback.end;

      return {
        ...prev,
        rows,
        cols,
        start,
        end,
        walls: remapIds(prev.walls, prev.cols, rows, cols),
        weights: remapIds(prev.weights, prev.cols, rows, cols),
      };
    });
  }, []);

  /** Paints a single cell. `mode` is 'wall' | 'weight' | 'erase'. */
  const paint = useCallback((id, mode) => {
    setState((prev) => {
      if (id === prev.start || id === prev.end) return prev;

      const inWalls = prev.walls.has(id);
      const inWeights = prev.weights.has(id);

      if (mode === 'erase' && !inWalls && !inWeights) return prev;
      if (mode === 'wall' && inWalls) return prev;
      if (mode === 'weight' && inWeights) return prev;

      const walls = new Set(prev.walls);
      const weights = new Set(prev.weights);
      walls.delete(id);
      weights.delete(id);
      if (mode === 'wall') walls.add(id);
      if (mode === 'weight') weights.add(id);

      return { ...prev, walls, weights };
    });
  }, []);

  const moveEndpoint = useCallback((which, id) => {
    setState((prev) => {
      const other = which === 'start' ? prev.end : prev.start;
      if (id === other || prev[which] === id) return prev;

      // An endpoint always lands on clear ground.
      const walls = new Set(prev.walls);
      const weights = new Set(prev.weights);
      walls.delete(id);
      weights.delete(id);

      return { ...prev, [which]: id, walls, weights };
    });
  }, []);

  const applyMaze = useCallback(({ walls = [], weights = [] }) => {
    setState((prev) => ({
      ...prev,
      walls: new Set(walls.filter((id) => id !== prev.start && id !== prev.end)),
      weights: new Set(weights.filter((id) => id !== prev.start && id !== prev.end)),
    }));
  }, []);

  const clearObstacles = useCallback(() => {
    setState((prev) =>
      prev.walls.size === 0 && prev.weights.size === 0
        ? prev
        : { ...prev, walls: new Set(), weights: new Set() },
    );
  }, []);

  const setAllowDiagonal = useCallback((allowDiagonal) => {
    setState((prev) => ({ ...prev, allowDiagonal }));
  }, []);

  /** Restores a saved scenario, re-fitting it if the viewport has changed. */
  const loadBoard = useCallback((grid) => {
    setState((prev) => {
      const rows = grid.rows;
      const cols = grid.cols;
      const fallback = defaultEndpoints(rows, cols);
      return {
        rows,
        cols,
        start: Number.isInteger(grid.start) ? grid.start : fallback.start,
        end: Number.isInteger(grid.end) ? grid.end : fallback.end,
        walls: new Set(grid.walls ?? []),
        weights: new Set(grid.weights ?? []),
        allowDiagonal: Boolean(grid.allowDiagonal ?? prev.allowDiagonal),
      };
    });
  }, []);

  const kindOf = useCallback(
    (id) => {
      if (id === state.start) return 'start';
      if (id === state.end) return 'end';
      if (state.walls.has(id)) return 'wall';
      if (state.weights.has(id)) return 'weight';
      return 'empty';
    },
    [state],
  );

  return useMemo(
    () => ({
      board: state,
      resize,
      paint,
      moveEndpoint,
      applyMaze,
      clearObstacles,
      setAllowDiagonal,
      loadBoard,
      kindOf,
    }),
    [state, resize, paint, moveEndpoint, applyMaze, clearObstacles, setAllowDiagonal, loadBoard, kindOf],
  );
}
