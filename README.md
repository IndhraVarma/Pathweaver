# Pathweaver

An interactive pathfinding visualizer. Draw walls, pour weighted terrain, and watch six classic
search algorithms negotiate the same grid — then race all six against one board and compare what
each one actually cost.

- **Client** — React 19 + Vite, no UI framework, no animation library.
- **API** — Express on Node 22, dependency-light and stateless apart from one JSON file.
- **Core** — one algorithm module, imported verbatim by both sides, so the animation on screen is
  the real search replayed rather than a second implementation that might drift.

---

## Quick start

```bash
npm install
npm run dev
```

- Client: <http://localhost:5173> (Vite proxies `/api` to the server)
- API: <http://localhost:4000>

To run it the way production does — one process serving both:

```bash
npm run preview     # builds the client, then starts the server on :4000
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | API with `--watch` and the Vite dev server, side by side |
| `npm run build` | Builds the client into `client/dist` |
| `npm start` | Starts the API; serves `client/dist` when it exists |
| `npm test` | Runs the full suite (`node --test`, no test framework) |
| `npm run lint` | Syntax-checks the entry points |

## How it fits together

```
shared/          the algorithm core — imported by BOTH the server and the client
  grid.js          validation, neighbours, movement cost
  algorithms.js    A*, Dijkstra, Greedy, BFS, DFS, Bidirectional BFS
  mazes.js         four deterministic, seedable board generators
  heap.js          binary min-heap

server/src/      Express API
  app.js           middleware, routes, static hosting of the built client
  routes/api.js    every endpoint
  lib/store.js     atomic JSON persistence for scenarios and run statistics

client/src/      React client
  components/      hero, grid, controls, comparison table, saved boards
  hooks/           board state, and the replay animator
  lib/             API wrapper with an in-browser fallback
```

**Why a shared core.** A visualizer that reimplements its algorithms in the UI eventually shows you
something the "real" implementation would not do. Here the server solves the board and returns the
complete settle order; the client only replays it. If the API is unreachable, the client imports the
identical module and runs it in the browser, and says so on screen.

**Why the animation bypasses React.** Re-rendering a few thousand cells sixty times a second is
exactly what makes a visualizer feel cheap. Each cell registers its DOM node once, and the replay
loop writes `data-state` directly onto the element for CSS to style. React still owns the structural
class — wall, weighted, endpoint — so the two never fight over the same attribute.

## API

Base path `/api`. Errors always come back as `{ "error": { "status", "message", "details"? } }`.

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness, uptime, version |
| `GET` | `/algorithms` | Algorithm and maze catalogue with descriptions |
| `POST` | `/solve` | Solve a board; `compare: true` runs all six |
| `POST` | `/maze` | Generate walls or weighted terrain for a board |
| `GET` | `/scenarios` | List saved boards |
| `POST` | `/scenarios` | Save the current board under a name |
| `GET` | `/scenarios/:id` | Fetch one saved board in full |
| `DELETE` | `/scenarios/:id` | Delete a saved board |
| `GET` | `/stats` | Per-algorithm averages across every run served |

A board is described by flat node indices, where `id = row * cols + col`:

```bash
curl -X POST http://localhost:4000/api/solve \
  -H 'Content-Type: application/json' \
  -d '{
    "rows": 21, "cols": 51,
    "start": 517, "end": 553,
    "walls": [100, 101, 102],
    "weights": [200, 201],
    "allowDiagonal": false,
    "algorithm": "astar"
  }'
```

The response carries `visitedOrder` (the order nodes were settled — this is what gets animated),
`path`, and `stats` with cells searched, path length, path cost and solve time.

Grids are capped at 200×200, bodies at 2 MB, and `/api` is rate limited per IP (240 requests/minute
by default). Weighted ground costs 8 per step against an ordinary step's 1.

## The algorithms

| Algorithm | Informed | Reads cost | Guarantee |
| --- | --- | --- | --- |
| A* Search | yes | yes | cheapest route |
| Dijkstra | no | yes | cheapest route |
| Greedy Best-First | yes | no | none |
| Breadth-First | no | no | fewest steps |
| Depth-First | no | no | none |
| Bidirectional BFS | no | no | fewest steps |

The tests pin the properties that matter: optimal solvers agree on path length, A* never settles more
nodes than Dijkstra, weighted solvers route around costly ground while unweighted ones plough
straight through it, and diagonal movement refuses to squeeze between two walls.

## Configuration

Every setting has a working default; see `.env.example` for the annotated list. The ones that matter
in production:

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | |
| `NODE_ENV` | `development` | `production` enables CSP and JSON logging |
| `DATA_FILE` | `./server/data/store.json` | Point at a mounted volume to keep saved boards |
| `TRUST_PROXY` | `1` in production | Needed for correct client IPs behind a proxy |
| `CORS_ORIGIN` | same-origin in production | Only set if you host the client elsewhere |
| `RATE_LIMIT_MAX` | `240` | Per IP, per window |

## Deploying

**Docker** — multi-stage build, runs as a non-root user, with a healthcheck:

```bash
docker compose up --build        # http://localhost:4000
```

Saved boards persist in the `pathweaver-data` volume.

**Vercel (client) + Render (API)** — the split both blueprints are currently written for.

| | Host | Config | Key setting |
| --- | --- | --- | --- |
| Client | Vercel | `vercel.json` | `VITE_API_BASE=https://<api>.onrender.com/api` |
| API | Render | `render.yaml` | `CORS_ORIGIN=https://<app>.vercel.app` |

Two rules make or break it. `VITE_API_BASE` is inlined **at build time**, so changing it needs a
redeploy, not a restart. And the Vercel project's Root Directory must stay at the repository root —
the client imports `shared/`, which sits outside `client/`, so a root directory of `client` cannot
see it.

**Render as a single service** — swap the build command to `npm ci --include=dev && npm run build`
and drop `CORS_ORIGIN`; the server then serves the built client itself from the same origin.

**Anywhere else** — it is one Node process. Build the client, set `NODE_ENV=production`, and run
`npm start`; the server serves the bundle from `client/dist` itself, so there is no second service
and no CORS to configure. `Procfile` covers Heroku-style platforms.

### Persistence

Scenarios and run statistics live in a single JSON file, written atomically (temp file + rename) and
capped at 200 saved boards and 1000 recorded runs. This keeps the service deployable anywhere with a
writable directory and no database to provision. If you need multi-replica deployments or real
query-ability, `server/src/lib/store.js` is the one file to replace — the routes only use its public
methods.

The in-memory rate limiter is per-instance for the same reason. Behind more than one replica, move it
to a shared store.

## Accessibility and motion

The grid exposes a labelled group with drawing instructions, every run announces its outcome through
a live region, the replay progress bar is a real `progressbar`, and all controls are reachable and
focus-visible. `prefers-reduced-motion` collapses the hero animation and the cell transitions.

## Tests

```bash
npm test
```

39 tests across four files, using only the Node test runner — no test framework to install:

- `test/pathfinding.test.mjs` — algorithm correctness, optimality, validation, maze determinism
- `test/api.test.mjs` — every endpoint, error shapes, persistence across a restart, rate limiting
- `test/board.test.mjs` — the client's grid-fitting and resize-remapping logic
- `test/render.test.mjs` — server-renders every component (esbuild compiles the JSX) so a crash on
  first paint fails the build, without needing a browser
