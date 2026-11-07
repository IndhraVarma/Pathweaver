# Pathweaver

### Explore pathfinding algorithms. Visualize their decisions. Compare their performance.

An interactive pathfinding visualizer that lets you design grid-based environments, run six classic search algorithms, and compare their behaviour on the same board.

**React 19 · Vite · Node.js · Express**

</div>

---

## Overview

Pathweaver is an interactive tool for understanding how pathfinding algorithms explore a search space and find routes through a grid.

Create obstacles, add weighted terrain, choose a search algorithm, and watch its exploration process replay step by step. You can also run all six algorithms against the same board to compare the work each one performs.

The project is built around a shared algorithm core: the client and server import the same implementation, so the visualization replays the actual search result rather than a separate approximation.

### Highlights

- Six pathfinding algorithms with different search strategies and guarantees.
- Interactive grid editing with walls, weighted terrain, and start/end nodes.
- Seedable maze and terrain generation.
- Step-by-step search visualization.
- Side-by-side algorithm comparison on the same board.
- Search statistics, including visited cells, path length, path cost, and solve time.
- Save and reload board scenarios.
- Browser-side fallback when the API is unavailable.
- Responsive, keyboard-accessible controls and reduced-motion support.

## Architecture at a Glance

| Layer | Technology | Responsibility |
|---|---|---|
| Client | React 19, Vite | Grid interaction, controls, visualization, and replay |
| API | Node.js 22, Express | Pathfinding requests, scenarios, and run statistics |
| Shared core | JavaScript modules | Grid rules, algorithms, mazes, and priority queue |
| Persistence | JSON file | Saved scenarios and run statistics |

The backend is stateless apart from a JSON persistence file. The shared algorithm modules are imported by both the client and server.

## Getting Started

### Prerequisites

- Node.js 22
- npm
- Git

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/pathweaver.git
cd pathweaver
```

Replace the example URL with your repository URL.

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development environment

```bash
npm run dev
```

The development command starts the Express API and Vite development server.

| Service | Local URL |
|---|---|
| Client | http://localhost:5173 |
| API | http://localhost:4000 |

During development, Vite proxies `/api` requests to the backend.

### 4. Run the production-style server locally

```bash
npm run preview
```

This command builds the client and starts the server on port `4000`. The Express application serves the built frontend and API from one process.

## Available Scripts

Run these commands from the repository root.

| Command | Description |
|---|---|
| `npm install` | Install project dependencies |
| `npm run dev` | Start the API and Vite development server |
| `npm run build` | Build the client into `client/dist` |
| `npm run preview` | Build the client and start the production-style server |
| `npm start` | Start the API; serve `client/dist` when available |
| `npm test` | Run the test suite with Node's built-in test runner |
| `npm run lint` | Syntax-check the configured entry points |

## How It Works

### Shared algorithm core

The `shared/` directory contains the pathfinding implementation used by both the browser and the API.

```text
shared/
├── grid.js          # Grid validation, neighbours, and movement costs
├── algorithms.js    # Six pathfinding algorithms
├── mazes.js         # Deterministic, seedable maze generators
└── heap.js          # Binary min-heap
```

The server solves the board and returns the complete node-settlement order. The client replays that order to visualize the search.

If the API is unavailable, the client can import the same shared modules and run the algorithm in the browser. The interface indicates when this fallback is being used.

### Efficient animation

The replay system avoids repeatedly re-rendering thousands of grid cells through React.

Each cell registers its DOM node once. During playback, the animation loop updates the cell's `data-state` attribute directly, allowing CSS to handle the visual state transitions. React continues to manage structural classes such as walls, weighted terrain, and endpoints.

This separates application structure from high-frequency animation updates.

## Pathfinding Algorithms

Pathweaver includes six algorithms:

| Algorithm | Informed search | Considers terrain cost | Guarantee |
|---|---:|---:|---|
| A* Search | Yes | Yes | Lowest-cost path |
| Dijkstra's Algorithm | No | Yes | Lowest-cost path |
| Greedy Best-First Search | Yes | No | No optimality guarantee |
| Breadth-First Search (BFS) | No | No | Fewest steps |
| Depth-First Search (DFS) | No | No | No optimality guarantee |
| Bidirectional BFS | No | No | Fewest steps |

### Weighted terrain

Weighted cells represent more expensive terrain. In the current configuration:

- Ordinary movement costs `1`.
- Weighted movement costs `8`.

Cost-aware algorithms can account for these values when selecting a route. Unweighted algorithms do not optimize for terrain cost.

### Comparison mode

Comparison mode runs all six algorithms against the same board. This makes it possible to examine differences in:

- Number of nodes explored.
- Path length.
- Total path cost.
- Solve time.
- Whether the algorithm finds an optimal route under the selected movement rules.

The comparison is useful for observing the trade-offs between informed and uninformed search, as well as cost-aware and unweighted algorithms.

## API Reference

All endpoints use the `/api` base path.

Errors follow a consistent response structure:

```json
{
  "error": {
    "status": 400,
    "message": "Description of the error",
    "details": {}
  }
}
```

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service liveness, uptime, and version |
| `GET` | `/api/algorithms` | Algorithm and maze catalogue |
| `POST` | `/api/solve` | Solve a board; optionally compare all six algorithms |
| `POST` | `/api/maze` | Generate walls or weighted terrain |
| `GET` | `/api/scenarios` | List saved boards |
| `POST` | `/api/scenarios` | Save a board with a name |
| `GET` | `/api/scenarios/:id` | Retrieve a saved board |
| `DELETE` | `/api/scenarios/:id` | Delete a saved board |
| `GET` | `/api/stats` | Per-algorithm averages across recorded runs |

### Solve request example

The grid is represented using flat node indices:

```text
node id = row * number of columns + column
```

Example request:

```bash
curl -X POST http://localhost:4000/api/solve \
  -H 'Content-Type: application/json' \
  -d '{
    "rows": 21,
    "cols": 51,
    "start": 517,
    "end": 553,
    "walls": [100, 101, 102],
    "weights": [200, 201],
    "allowDiagonal": false,
    "algorithm": "astar"
  }'
```

The response includes:

| Field | Description |
|---|---|
| `visitedOrder` | Order in which nodes were settled; used for the visualization replay |
| `path` | Nodes forming the resulting route |
| `stats` | Search metrics, including explored cells, path length, path cost, and solve time |

Set `compare: true` in the request to run all six algorithms against the same board.

### API limits

- Maximum grid size: `200 × 200`.
- Maximum request body size: `2 MB`.
- API rate limit: `240` requests per minute per IP by default.

The rate limit can be configured using environment variables.

## Project Structure

```text
pathweaver/
├── shared/
│   ├── grid.js
│   ├── algorithms.js
│   ├── mazes.js
│   └── heap.js
│
├── server/
│   └── src/
│       ├── app.js
│       ├── routes/
│       │   └── api.js
│       └── lib/
│           └── store.js
│
├── client/
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── lib/
│
├── test/
│   ├── pathfinding.test.mjs
│   ├── api.test.mjs
│   ├── board.test.mjs
│   └── render.test.mjs
│
├── .env.example
├── Dockerfile
├── compose.yaml
├── render.yaml
├── Procfile
└── package.json
```

### Key design decisions

**One algorithm implementation**

The client and server import the same algorithm modules. This avoids maintaining separate implementations that could produce different results.

**Replay the actual search**

The server returns the search's settlement order. The client visualizes that result rather than running a second, potentially inconsistent animation algorithm.

**Lightweight persistence**

Saved boards and run statistics are stored in a JSON file. Writes use a temporary file followed by a rename to reduce the risk of partially written data.

**Replaceable storage layer**

Persistence operations are isolated in `server/src/lib/store.js`. The route handlers use the store's public methods, making it the primary replacement point if the project later moves to a database.

## Configuration

The project provides an annotated `.env.example`. The following settings are particularly relevant when deploying.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Server listening port |
| `NODE_ENV` | `development` | Runtime environment; production enables CSP and JSON logging |
| `DATA_FILE` | `./server/data/store.json` | Path to the JSON persistence file |
| `TRUST_PROXY` | `1` in production | Proxy trust configuration for client IP handling |
| `CORS_ORIGIN` | Same-origin in production | Allowed client origin when hosting the frontend separately |
| `RATE_LIMIT_MAX` | `240` | Maximum requests per IP per rate-limit window |

Defaults are provided, so configuration is not required for a basic local run.

## Deployment

Pathweaver can run as a single Node.js service or be hosted with the client and API on separate platforms.

### Option 1: Docker

Build and start the application:

```bash
docker compose up --build
```

Open:

```text
http://localhost:4000
```

The Docker setup uses a multi-stage build and runs the application as a non-root user. A health check is configured, and the `pathweaver-data` volume is used to persist saved boards and statistics.

### Option 2: Render

The repository includes a `render.yaml` blueprint.

1. Push the repository to GitHub.
2. Open [Render](https://render.com/).
3. Select **New → Blueprint**.
4. Connect the repository and apply the blueprint.

The supplied configuration:

- Installs dependencies with `npm ci --include=dev && npm run build`.
- Starts the application with `npm start`.
- Uses `/api/health` as the health-check endpoint.
- Mounts a 1 GB disk at `/var/data`.
- Stores persistent data on the mounted disk.

**Why install development dependencies during the build?**

Vite is a development dependency. When `NODE_ENV=production` causes npm to omit development dependencies, the frontend build cannot run. The configured build command explicitly includes them.

**Render free-tier note:** Persistent disks are not available on Render's free tier. If deploying without a disk, remove the `disk` configuration and the `DATA_FILE` setting that points to `/var/data`. The application can still run, but saved boards and statistics may reset when the instance restarts or spins down.

### Option 3: Separate frontend and API hosting

Hosting the frontend on a static platform or CDN and the API separately is also supported.

Configure the frontend at build time:

```env
VITE_API_BASE=<your-api-base-url>
```

Configure the backend:

```env
CORS_ORIGIN=<your-frontend-origin>
```

Use the API's absolute URL for `VITE_API_BASE` and the frontend's origin for `CORS_ORIGIN`.

### Option 4: Any Node.js hosting platform

Pathweaver can run on platforms that support a Node.js process and a writable data directory.

1. Install dependencies.
2. Build the frontend.
3. Set `NODE_ENV=production`.
4. Configure a persistent `DATA_FILE` path if saved data must survive restarts.
5. Run:

```bash
npm start
```

The Express server serves the built frontend from `client/dist`, so a separate frontend service is not required. The included `Procfile` supports Heroku-style process configuration.

## Persistence and Scaling

Scenarios and run statistics are stored in a single JSON file.

- Writes use a temporary file and rename operation.
- The store is capped at 200 saved boards.
- The store is capped at 1,000 recorded runs.
- A writable directory is required for persistence.

This approach keeps deployment simple and avoids the need to provision a database for the current project scope.

There are two scaling considerations:

1. **Multiple server replicas:** Each instance would have its own local JSON file unless storage is moved to a shared service.
2. **Rate limiting:** The current in-memory rate limiter is per instance. Multi-replica deployments should use a shared rate-limit store.

For deployments requiring multiple replicas or richer queries, replace the persistence implementation behind `server/src/lib/store.js` with a shared database or storage service.

## Accessibility and Motion

Accessibility is considered in the grid and application controls:

- The grid exposes a labelled group with drawing instructions.
- Run outcomes are announced through a live region.
- Replay progress is exposed using the `progressbar` role.
- Controls are keyboard accessible and provide visible focus states.
- `prefers-reduced-motion` reduces the hero animation and cell transitions.

## Testing

Run the complete test suite:

```bash
npm test
```

The project uses Node.js's built-in test runner, so no separate test framework is required.

### Test coverage

The supplied project notes report **39 tests across four files**.

| Test file | Coverage |
|---|---|
| `test/pathfinding.test.mjs` | Algorithm correctness, optimality, validation, and deterministic maze generation |
| `test/api.test.mjs` | API endpoints, error responses, persistence across restarts, and rate limiting |
| `test/board.test.mjs` | Grid fitting and resize-remapping logic |
| `test/render.test.mjs` | Server-side rendering of components and first-render failures |

The pathfinding tests cover important algorithm properties, including agreement between optimal solvers, A* exploration compared with Dijkstra, weighted-terrain behaviour, and diagonal movement restrictions near walls.

Run the suite in your environment to verify the current test results after making changes.

## Future Enhancements

Potential directions for extending Pathweaver include:

- More search algorithms and heuristic options.
- Additional maze-generation techniques.
- Configurable movement costs and terrain types.
- Export and import of board scenarios.
- More detailed algorithm comparison and performance reporting.
- Shared persistence and rate limiting for multi-instance deployments.

These are potential improvements, not features currently claimed as implemented.

## License

Add your chosen license and corresponding `LICENSE` file before publishing the repository.

---

<div align="center">

**Pathweaver** — See how search algorithms find their way.

</div>
"""

