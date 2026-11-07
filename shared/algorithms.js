/**
 * Pathfinding algorithms. Every solver returns the same shape so the UI can
 * animate any of them with one code path:
 *
 *   { visitedOrder: number[], path: number[], found: boolean, cost: number }
 *
 * `visitedOrder` is the order in which nodes were *settled* (dequeued), which
 * is what makes the search front legible when replayed frame by frame.
 */
import { MinHeap } from './heap.js';
import { BASE_COST, GridError, neighboursOf, costOf } from './grid.js';

export const ALGORITHMS = [
  {
    id: 'astar',
    name: 'A* Search',
    kind: 'informed',
    weighted: true,
    guarantee: 'shortest',
    blurb:
      'Dijkstra steered by a heuristic. Expands the node with the best estimated total cost, so it reaches the goal while touching far fewer cells.',
  },
  {
    id: 'dijkstra',
    name: 'Dijkstra',
    kind: 'uninformed',
    weighted: true,
    guarantee: 'shortest',
    blurb:
      'Expands outward in order of true distance from the start. Optimal on weighted terrain, but it has no sense of where the goal is.',
  },
  {
    id: 'greedy',
    name: 'Greedy Best-First',
    kind: 'informed',
    weighted: false,
    guarantee: 'none',
    blurb:
      'Always chases the lowest heuristic value. Often dramatically fast, and happily walks into dead ends. No optimality guarantee.',
  },
  {
    id: 'bfs',
    name: 'Breadth-First',
    kind: 'uninformed',
    weighted: false,
    guarantee: 'fewest-steps',
    blurb:
      'Explores the frontier ring by ring. Guarantees the fewest number of steps, but ignores terrain cost entirely.',
  },
  {
    id: 'dfs',
    name: 'Depth-First',
    kind: 'uninformed',
    weighted: false,
    guarantee: 'none',
    blurb:
      'Commits to one corridor until it dead-ends, then backtracks. Rarely sensible for pathfinding, and wonderful for showing why.',
  },
  {
    id: 'bidirectional',
    name: 'Bidirectional BFS',
    kind: 'uninformed',
    weighted: false,
    guarantee: 'fewest-steps',
    blurb:
      'Two breadth-first searches, one from each end, meeting in the middle. Roughly halves the explored area on open grids.',
  },
];

export const ALGORITHM_IDS = ALGORITHMS.map((entry) => entry.id);

export function getAlgorithm(id) {
  return ALGORITHMS.find((entry) => entry.id === id) ?? null;
}

/** Octile distance when diagonals are allowed, Manhattan otherwise. */
export function heuristic(grid, from, to) {
  const { cols } = grid;
  const dx = Math.abs((from % cols) - (to % cols));
  const dy = Math.abs(Math.floor(from / cols) - Math.floor(to / cols));
  if (!grid.allowDiagonal) return (dx + dy) * BASE_COST;
  const diagonal = Math.min(dx, dy);
  return (dx + dy - 2 * diagonal + Math.SQRT2 * diagonal) * BASE_COST;
}

function reconstruct(cameFrom, end) {
  const path = [];
  let current = end;
  while (current !== undefined && current !== -1) {
    path.push(current);
    current = cameFrom[current];
  }
  return path.reverse();
}

function pathCost(grid, path) {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    const prev = path[i - 1];
    const next = path[i];
    const diagonal =
      Math.floor(prev / grid.cols) !== Math.floor(next / grid.cols) &&
      prev % grid.cols !== next % grid.cols;
    total += costOf(grid, next, diagonal);
  }
  return Number(total.toFixed(3));
}

/* ------------------------------------------------------------------ */
/* Weighted searches: Dijkstra, A*                                      */
/* ------------------------------------------------------------------ */

function bestFirst(grid, { useHeuristic }) {
  const { start, end, size } = grid;
  const dist = new Float64Array(size).fill(Infinity);
  const cameFrom = new Int32Array(size).fill(-1);
  const settled = new Uint8Array(size);
  const queue = new MinHeap();
  const visitedOrder = [];

  dist[start] = 0;
  queue.push(start, useHeuristic ? heuristic(grid, start, end) : 0);

  while (queue.size > 0) {
    const current = queue.pop();
    if (settled[current]) continue;
    settled[current] = 1;
    visitedOrder.push(current);

    if (current === end) {
      const path = reconstruct(cameFrom, end);
      return { visitedOrder, path, found: true, cost: pathCost(grid, path) };
    }

    for (const { id, cost } of neighboursOf(grid, current)) {
      if (settled[id]) continue;
      const tentative = dist[current] + cost;
      if (tentative >= dist[id]) continue;
      dist[id] = tentative;
      cameFrom[id] = current;
      queue.push(id, useHeuristic ? tentative + heuristic(grid, id, end) : tentative);
    }
  }

  return { visitedOrder, path: [], found: false, cost: 0 };
}

export function dijkstra(grid) {
  return bestFirst(grid, { useHeuristic: false });
}

export function astar(grid) {
  return bestFirst(grid, { useHeuristic: true });
}

/** Pure greedy: priority is the heuristic alone, accumulated cost ignored. */
export function greedy(grid) {
  const { start, end, size } = grid;
  const cameFrom = new Int32Array(size).fill(-1);
  const seen = new Uint8Array(size);
  const settled = new Uint8Array(size);
  const queue = new MinHeap();
  const visitedOrder = [];

  seen[start] = 1;
  queue.push(start, heuristic(grid, start, end));

  while (queue.size > 0) {
    const current = queue.pop();
    if (settled[current]) continue;
    settled[current] = 1;
    visitedOrder.push(current);

    if (current === end) {
      const path = reconstruct(cameFrom, end);
      return { visitedOrder, path, found: true, cost: pathCost(grid, path) };
    }

    for (const { id } of neighboursOf(grid, current)) {
      if (seen[id]) continue;
      seen[id] = 1;
      cameFrom[id] = current;
      queue.push(id, heuristic(grid, id, end));
    }
  }

  return { visitedOrder, path: [], found: false, cost: 0 };
}

/* ------------------------------------------------------------------ */
/* Unweighted searches: BFS, DFS, Bidirectional BFS                    */
/* ------------------------------------------------------------------ */

export function bfs(grid) {
  const { start, end, size } = grid;
  const cameFrom = new Int32Array(size).fill(-1);
  const seen = new Uint8Array(size);
  const visitedOrder = [];
  const queue = [start];
  let head = 0;
  seen[start] = 1;

  while (head < queue.length) {
    const current = queue[head];
    head += 1;
    visitedOrder.push(current);

    if (current === end) {
      const path = reconstruct(cameFrom, end);
      return { visitedOrder, path, found: true, cost: pathCost(grid, path) };
    }

    for (const { id } of neighboursOf(grid, current)) {
      if (seen[id]) continue;
      seen[id] = 1;
      cameFrom[id] = current;
      queue.push(id);
    }
  }

  return { visitedOrder, path: [], found: false, cost: 0 };
}

export function dfs(grid) {
  const { start, end, size } = grid;
  const cameFrom = new Int32Array(size).fill(-1);
  const seen = new Uint8Array(size);
  const visitedOrder = [];
  const stack = [start];

  while (stack.length > 0) {
    const current = stack.pop();
    if (seen[current]) continue;
    seen[current] = 1;
    visitedOrder.push(current);

    if (current === end) {
      const path = reconstruct(cameFrom, end);
      return { visitedOrder, path, found: true, cost: pathCost(grid, path) };
    }

    const neighbours = neighboursOf(grid, current);
    for (let i = neighbours.length - 1; i >= 0; i -= 1) {
      const { id } = neighbours[i];
      if (seen[id]) continue;
      cameFrom[id] = current;
      stack.push(id);
    }
  }

  return { visitedOrder, path: [], found: false, cost: 0 };
}

export function bidirectional(grid) {
  const { start, end, size } = grid;
  const visitedOrder = [];

  const fromStart = {
    queue: [start],
    head: 0,
    seen: new Uint8Array(size),
    cameFrom: new Int32Array(size).fill(-1),
  };
  const fromEnd = {
    queue: [end],
    head: 0,
    seen: new Uint8Array(size),
    cameFrom: new Int32Array(size).fill(-1),
  };
  fromStart.seen[start] = 1;
  fromEnd.seen[end] = 1;

  const joinAt = (meeting) => {
    const head = reconstruct(fromStart.cameFrom, meeting);
    const tail = reconstruct(fromEnd.cameFrom, meeting).reverse();
    const path = head.concat(tail.slice(1));
    return { visitedOrder, path, found: true, cost: pathCost(grid, path) };
  };

  // Expand one full BFS layer per side, alternating, so both fronts grow evenly.
  while (fromStart.head < fromStart.queue.length && fromEnd.head < fromEnd.queue.length) {
    for (const side of [fromStart, fromEnd]) {
      const other = side === fromStart ? fromEnd : fromStart;
      const layerEnd = side.queue.length;

      while (side.head < layerEnd) {
        const current = side.queue[side.head];
        side.head += 1;
        visitedOrder.push(current);

        if (other.seen[current]) return joinAt(current);

        for (const { id } of neighboursOf(grid, current)) {
          if (side.seen[id]) continue;
          side.seen[id] = 1;
          side.cameFrom[id] = current;
          if (other.seen[id]) {
            visitedOrder.push(id);
            return joinAt(id);
          }
          side.queue.push(id);
        }
      }
    }
  }

  return { visitedOrder, path: [], found: false, cost: 0 };
}

const SOLVERS = { astar, dijkstra, greedy, bfs, dfs, bidirectional };

/**
 * Runs `algorithmId` against a normalised grid and returns the result plus
 * timing and summary statistics.
 */
export function solve(grid, algorithmId) {
  const solver = SOLVERS[algorithmId];
  if (!solver) {
    throw new GridError(
      'unknown algorithm "' + algorithmId + '" (expected one of: ' + ALGORITHM_IDS.join(', ') + ')',
    );
  }

  const startedAt = now();
  const result = solver(grid);
  const elapsedMs = Number((now() - startedAt).toFixed(3));

  return {
    algorithm: algorithmId,
    found: result.found,
    visitedOrder: result.visitedOrder,
    path: result.path,
    stats: {
      visited: result.visitedOrder.length,
      pathLength: result.path.length,
      pathCost: result.cost,
      elapsedMs,
      explorationRatio: Number((result.visitedOrder.length / grid.size).toFixed(4)),
    },
  };
}

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}
