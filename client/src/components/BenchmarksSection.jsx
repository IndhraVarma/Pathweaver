import { useCallback, useEffect, useState } from 'react';

import * as api from '../lib/api.js';

/**
 * Aggregate statistics across every search this deployment has run — the one
 * view that only exists because there is a server keeping score.
 */
export function BenchmarksSection({ catalogue, refreshToken }) {
  const [stats, setStats] = useState(null);
  const [state, setState] = useState('loading');

  const load = useCallback(async () => {
    try {
      setStats(await api.fetchStats());
      setState('ready');
    } catch {
      setState('offline');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshToken]);

  const nameOf = (id) => catalogue.algorithms.find((entry) => entry.id === id)?.name ?? id;
  const rows = stats?.algorithms ?? [];
  const maxVisited = Math.max(...rows.map((row) => row.avgVisited ?? 0), 1);

  return (
    <section className="section section--benchmarks" id="benchmarks">
      <div className="shell">
        <header className="section__head">
          <p className="micro">04 / The record</p>
          <h2 className="section__title">
            Every search, <span className="accent">remembered.</span>
          </h2>
          <p className="section__lede">
            The API records the shape of each run it serves. These are the running averages across
            every board anyone has solved here.
          </p>
        </header>

        {state === 'offline' && (
          <p className="notice">
            The API server is not reachable, so there is no record to show. Start it with{' '}
            <code>npm run dev</code> and the numbers will appear.
          </p>
        )}

        {state === 'ready' && rows.length === 0 && (
          <p className="notice">No searches recorded yet. Run one on the grid above.</p>
        )}

        {rows.length > 0 && (
          <>
            <p className="benchmarks__total micro">
              {stats.totalRuns.toLocaleString()} searches recorded
            </p>

            <table className="race__table">
              <thead>
                <tr>
                  <th scope="col">Algorithm</th>
                  <th scope="col">Runs</th>
                  <th scope="col">Avg cells searched</th>
                  <th scope="col">Avg steps</th>
                  <th scope="col">Avg cost</th>
                  <th scope="col">Avg time</th>
                  <th scope="col">Solved</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.algorithm}>
                    <th scope="row">{nameOf(row.algorithm)}</th>
                    <td>{row.runs.toLocaleString()}</td>
                    <td>
                      <span className="race__bar">
                        <span
                          className="race__bar-fill"
                          style={{ '--fill': `${(row.avgVisited / maxVisited) * 100}%` }}
                        />
                        <span className="race__bar-value">{row.avgVisited?.toLocaleString()}</span>
                      </span>
                    </td>
                    <td>{row.avgPathLength ?? '—'}</td>
                    <td>{row.avgPathCost ?? '—'}</td>
                    <td>{row.avgElapsedMs} ms</td>
                    <td>{Math.round(row.solveRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <button type="button" className="ctl" onClick={load}>
          Refresh
        </button>
      </div>
    </section>
  );
}
