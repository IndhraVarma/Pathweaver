/**
 * Maze and terrain generators. Each returns `{ walls: number[], weights: number[] }`
 * in the same flat node-index form the solvers consume, leaving `start` and
 * `end` untouched so a freshly generated board is always solvable to attempt.
 */

export const MAZE_TYPES = [
  {
    id: 'recursive-division',
    name: 'Recursive Division',
    blurb: 'Chambers split by walls with a single gap, recursively. Produces clean, room-like labyrinths.',
  },
  {
    id: 'backtracker',
    name: 'Recursive Backtracker',
    blurb: 'A depth-first carve through a solid block. Long, winding corridors with few loops.',
  },
  {
    id: 'random',
    name: 'Scatter',
    blurb: 'Independent random obstacles at a fixed density. Open, noisy terrain.',
  },
  {
    id: 'terrain',
    name: 'Weighted Terrain',
    blurb: 'Soft drifts of costly ground instead of hard walls. Only the weighted solvers tell the difference.',
  },
];

export const MAZE_IDS = MAZE_TYPES.map((entry) => entry.id);

/** Mulberry32 — a small deterministic PRNG so a seed reproduces a maze exactly. */
function createRandom(seed) {
  let state = (seed >>> 0) || 1;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function protectedIds(options) {
  // Keep the endpoints and their immediate neighbourhood clear.
  const { rows, cols, start, end } = options;
  const keep = new Set();
  for (const id of [start, end]) {
    const r = Math.floor(id / cols);
    const c = id % cols;
    for (let dr = -1; dr <= 1; dr += 1) {
      for (let dc = -1; dc <= 1; dc += 1) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) keep.add(nr * cols + nc);
      }
    }
  }
  return keep;
}

export function generateMaze(type, options) {
  const { rows, cols } = options;
  const seed = Number.isFinite(options.seed) ? options.seed : Math.floor(Math.random() * 2 ** 31);
  const random = createRandom(seed);
  const keep = protectedIds(options);

  let raw;
  switch (type) {
    case 'recursive-division':
      raw = recursiveDivision(rows, cols, random);
      break;
    case 'backtracker':
      raw = recursiveBacktracker(rows, cols, random);
      break;
    case 'random':
      raw = scatter(rows, cols, random, options.density ?? 0.28);
      break;
    case 'terrain':
      raw = weightedTerrain(rows, cols, random);
      break;
    default:
      raw = { walls: [], weights: [] };
  }

  return {
    seed,
    type,
    walls: raw.walls.filter((id) => !keep.has(id)),
    weights: raw.weights.filter((id) => !keep.has(id)),
  };
}

/* ------------------------------------------------------------------ */

function scatter(rows, cols, random, density) {
  const walls = [];
  for (let id = 0; id < rows * cols; id += 1) {
    if (random() < density) walls.push(id);
  }
  return { walls, weights: [] };
}

function weightedTerrain(rows, cols, random) {
  const weights = new Set();
  const blobs = Math.max(4, Math.round((rows * cols) / 90));

  for (let i = 0; i < blobs; i += 1) {
    let r = Math.floor(random() * rows);
    let c = Math.floor(random() * cols);
    const steps = 10 + Math.floor(random() * 30);
    for (let step = 0; step < steps; step += 1) {
      if (r >= 0 && r < rows && c >= 0 && c < cols) weights.add(r * cols + c);
      if (random() < 0.5) r += random() < 0.5 ? 1 : -1;
      else c += random() < 0.5 ? 1 : -1;
    }
  }

  return { walls: [], weights: [...weights] };
}

function recursiveDivision(rows, cols, random) {
  const walls = new Set();

  // Solid border keeps the chambers readable.
  for (let c = 0; c < cols; c += 1) {
    walls.add(c);
    walls.add((rows - 1) * cols + c);
  }
  for (let r = 0; r < rows; r += 1) {
    walls.add(r * cols);
    walls.add(r * cols + cols - 1);
  }

  const divide = (top, left, height, width) => {
    if (height < 3 || width < 3) return;

    const horizontal = width < height ? true : height < width ? false : random() < 0.5;

    if (horizontal) {
      const wallRow = top + 1 + 2 * Math.floor((random() * (height - 2)) / 2);
      const gapCol = left + 2 * Math.floor((random() * (width + 1)) / 2);
      for (let c = left; c < left + width; c += 1) {
        if (c !== gapCol) walls.add(wallRow * cols + c);
      }
      divide(top, left, wallRow - top, width);
      divide(wallRow + 1, left, top + height - wallRow - 1, width);
    } else {
      const wallCol = left + 1 + 2 * Math.floor((random() * (width - 2)) / 2);
      const gapRow = top + 2 * Math.floor((random() * (height + 1)) / 2);
      for (let r = top; r < top + height; r += 1) {
        if (r !== gapRow) walls.add(r * cols + wallCol);
      }
      divide(top, left, height, wallCol - left);
      divide(top, wallCol + 1, height, left + width - wallCol - 1);
    }
  };

  divide(1, 1, rows - 2, cols - 2);
  return { walls: [...walls], weights: [] };
}

function recursiveBacktracker(rows, cols, random) {
  // Carve corridors out of a solid block, moving two cells at a time so the
  // cells between carved nodes become the walls.
  const carved = new Uint8Array(rows * cols);
  const startRow = 1;
  const startCol = 1;
  const stack = [[startRow, startCol]];
  carved[startRow * cols + startCol] = 1;

  const directions = [
    [-2, 0],
    [0, 2],
    [2, 0],
    [0, -2],
  ];

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const options = [];

    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr > 0 && nr < rows - 1 && nc > 0 && nc < cols - 1 && !carved[nr * cols + nc]) {
        options.push([nr, nc, r + dr / 2, c + dc / 2]);
      }
    }

    if (options.length === 0) {
      stack.pop();
      continue;
    }

    const [nr, nc, br, bc] = options[Math.floor(random() * options.length)];
    carved[nr * cols + nc] = 1;
    carved[br * cols + bc] = 1;
    stack.push([nr, nc]);
  }

  const walls = [];
  for (let id = 0; id < rows * cols; id += 1) {
    if (!carved[id]) walls.push(id);
  }
  return { walls, weights: [] };
}
