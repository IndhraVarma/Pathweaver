import { useEffect, useState } from 'react';

import * as api from '../lib/api.js';

/**
 * Saved boards, persisted by the API.
 *
 * This is the one feature that genuinely needs the server, so it states
 * plainly when the server is not reachable rather than failing quietly.
 */
export function ScenarioShelf({ board, onLoad, busy }) {
  const [scenarios, setScenarios] = useState([]);
  const [name, setName] = useState('');
  const [status, setStatus] = useState({ kind: 'idle', message: '' });

  const refresh = async () => {
    try {
      setScenarios(await api.listScenarios());
      setStatus((prev) => (prev.kind === 'offline' ? { kind: 'idle', message: '' } : prev));
    } catch {
      setStatus({ kind: 'offline', message: 'Saved boards need the API server running.' });
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const save = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setStatus({ kind: 'saving', message: 'Saving…' });
    try {
      await api.saveScenario({ name: trimmed, ...board });
      setName('');
      setStatus({ kind: 'saved', message: `Saved “${trimmed}”.` });
      await refresh();
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error.status ? error.message : 'Could not reach the API server.',
      });
    }
  };

  const load = async (id) => {
    try {
      const scenario = await api.loadScenario(id);
      onLoad(scenario.grid);
      setStatus({ kind: 'saved', message: `Loaded “${scenario.name}”.` });
    } catch (error) {
      setStatus({ kind: 'error', message: error.message ?? 'Could not load that board.' });
    }
  };

  const remove = async (id) => {
    try {
      await api.deleteScenario(id);
      await refresh();
    } catch (error) {
      setStatus({ kind: 'error', message: error.message ?? 'Could not delete that board.' });
    }
  };

  return (
    <section className="shelf" aria-labelledby="shelf-title">
      <div className="shelf__head">
        <p className="micro" id="shelf-title">
          Saved boards
        </p>
        <form className="shelf__form" onSubmit={save}>
          <input
            className="input"
            type="text"
            value={name}
            maxLength={60}
            placeholder="Name this board"
            onChange={(event) => setName(event.target.value)}
            aria-label="Name for the board you are saving"
          />
          <button type="submit" className="ctl" disabled={busy || !name.trim()}>
            Save
          </button>
        </form>
      </div>

      {status.message && (
        <p className={`shelf__status shelf__status--${status.kind}`} role="status">
          {status.message}
        </p>
      )}

      {scenarios.length > 0 && (
        <ul className="shelf__list">
          {scenarios.map((scenario) => (
            <li key={scenario.id} className="shelf__item">
              <button
                type="button"
                className="shelf__load"
                onClick={() => load(scenario.id)}
                disabled={busy}
              >
                <span className="shelf__name">{scenario.name}</span>
                <span className="shelf__meta">
                  {scenario.rows}×{scenario.cols} · {scenario.wallCount} walls ·{' '}
                  {scenario.weightCount} weighted
                </span>
              </button>
              <button
                type="button"
                className="shelf__delete"
                onClick={() => remove(scenario.id)}
                aria-label={`Delete ${scenario.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
