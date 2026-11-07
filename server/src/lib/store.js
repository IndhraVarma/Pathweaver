import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * A tiny durable JSON store.
 *
 * Scenarios and run statistics are small, append-mostly collections, so a
 * single JSON file keeps the service deployable anywhere with a writable
 * directory and no database to provision. Writes are serialised through one
 * promise chain and land atomically via write-to-temp + rename, so a crash
 * mid-write cannot leave a half-written file behind.
 */
export class JsonStore {
  #file;
  #state;
  #queue = Promise.resolve();
  #limits;

  constructor({ file, limits = {} }) {
    this.#file = file;
    this.#limits = { scenarios: 200, runs: 1000, ...limits };
  }

  async init() {
    await fs.mkdir(path.dirname(this.#file), { recursive: true });
    try {
      const raw = await fs.readFile(this.#file, 'utf8');
      const parsed = JSON.parse(raw);
      this.#state = {
        scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios : [],
        runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      };
    } catch (error) {
      if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
      // Missing or corrupt file: start clean rather than refusing to boot.
      this.#state = { scenarios: [], runs: [] };
      await this.#flush();
    }
    return this;
  }

  listScenarios() {
    return this.#state.scenarios.map(summariseScenario);
  }

  getScenario(id) {
    return this.#state.scenarios.find((entry) => entry.id === id) ?? null;
  }

  async saveScenario(scenario) {
    const record = {
      ...scenario,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };

    return this.#mutate((state) => {
      state.scenarios.unshift(record);
      if (state.scenarios.length > this.#limits.scenarios) {
        state.scenarios.length = this.#limits.scenarios;
      }
      return record;
    });
  }

  async deleteScenario(id) {
    return this.#mutate((state) => {
      const index = state.scenarios.findIndex((entry) => entry.id === id);
      if (index === -1) return false;
      state.scenarios.splice(index, 1);
      return true;
    });
  }

  async recordRun(run) {
    return this.#mutate((state) => {
      state.runs.unshift({ ...run, at: new Date().toISOString() });
      if (state.runs.length > this.#limits.runs) state.runs.length = this.#limits.runs;
      return true;
    });
  }

  /** Aggregates recorded runs into per-algorithm averages. */
  stats() {
    const byAlgorithm = new Map();

    for (const run of this.#state.runs) {
      const entry = byAlgorithm.get(run.algorithm) ?? {
        algorithm: run.algorithm,
        runs: 0,
        solved: 0,
        totalVisited: 0,
        totalPathLength: 0,
        totalCost: 0,
        totalElapsedMs: 0,
      };

      entry.runs += 1;
      if (run.found) {
        entry.solved += 1;
        entry.totalPathLength += run.pathLength ?? 0;
        entry.totalCost += run.pathCost ?? 0;
      }
      entry.totalVisited += run.visited ?? 0;
      entry.totalElapsedMs += run.elapsedMs ?? 0;
      byAlgorithm.set(run.algorithm, entry);
    }

    const algorithms = [...byAlgorithm.values()]
      .map((entry) => ({
        algorithm: entry.algorithm,
        runs: entry.runs,
        solveRate: round(entry.solved / entry.runs, 3),
        avgVisited: round(entry.totalVisited / entry.runs, 1),
        avgElapsedMs: round(entry.totalElapsedMs / entry.runs, 3),
        avgPathLength: entry.solved ? round(entry.totalPathLength / entry.solved, 1) : null,
        avgPathCost: entry.solved ? round(entry.totalCost / entry.solved, 2) : null,
      }))
      .sort((a, b) => b.runs - a.runs);

    return { totalRuns: this.#state.runs.length, algorithms };
  }

  /** Serialises every mutation, then persists. */
  #mutate(fn) {
    const next = this.#queue.then(async () => {
      const result = fn(this.#state);
      await this.#flush();
      return result;
    });
    // Keep the chain alive even if one mutation rejects.
    this.#queue = next.catch(() => {});
    return next;
  }

  async #flush() {
    const temp = `${this.#file}.${process.pid}.tmp`;
    await fs.writeFile(temp, JSON.stringify(this.#state, null, 2), 'utf8');
    await fs.rename(temp, this.#file);
  }
}

function summariseScenario(scenario) {
  return {
    id: scenario.id,
    name: scenario.name,
    createdAt: scenario.createdAt,
    rows: scenario.grid.rows,
    cols: scenario.grid.cols,
    wallCount: scenario.grid.walls.length,
    weightCount: scenario.grid.weights.length,
  };
}

function round(value, places) {
  return Number.isFinite(value) ? Number(value.toFixed(places)) : null;
}
