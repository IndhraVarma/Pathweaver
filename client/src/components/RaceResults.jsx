/**
 * Side-by-side comparison after a race: every algorithm run against the exact
 * same board. Bars are scaled to the widest result so the difference between
 * an informed and an uninformed search is immediately obvious.
 */
export function RaceResults({ results, catalogue, onReplay, busy }) {
  if (!results?.length) return null;

  const nameOf = (id) => catalogue.algorithms.find((entry) => entry.id === id)?.name ?? id;
  const maxVisited = Math.max(...results.map((entry) => entry.stats.visited), 1);
  const best = results
    .filter((entry) => entry.found)
    .reduce((a, b) => (a === null || b.stats.pathCost < a.stats.pathCost ? b : a), null);

  return (
    <div className="race">
      <div className="race__head">
        <p className="micro">Race results · one board, six searches</p>
        {best && (
          <p className="race__note">
            Cheapest route: <span className="accent">{nameOf(best.algorithm)}</span> at a cost of{' '}
            {best.stats.pathCost}
          </p>
        )}
      </div>

      <table className="race__table">
        <thead>
          <tr>
            <th scope="col">Algorithm</th>
            <th scope="col">Cells searched</th>
            <th scope="col">Steps</th>
            <th scope="col">Cost</th>
            <th scope="col">Time</th>
            <th scope="col">
              <span className="visually-hidden">Replay</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...results]
            .sort((a, b) => a.stats.visited - b.stats.visited)
            .map((entry) => {
              const optimal = best && entry.found && entry.stats.pathCost === best.stats.pathCost;
              return (
                <tr key={entry.algorithm} className={entry.found ? '' : 'race__row--failed'}>
                  <th scope="row">
                    {nameOf(entry.algorithm)}
                    {optimal && <span className="race__badge">optimal</span>}
                  </th>
                  <td>
                    <span className="race__bar">
                      <span
                        className="race__bar-fill"
                        style={{ '--fill': `${(entry.stats.visited / maxVisited) * 100}%` }}
                      />
                      <span className="race__bar-value">{entry.stats.visited.toLocaleString()}</span>
                    </span>
                  </td>
                  <td>{entry.found ? entry.stats.pathLength : '—'}</td>
                  <td>{entry.found ? entry.stats.pathCost : '—'}</td>
                  <td>{entry.stats.elapsedMs} ms</td>
                  <td>
                    <button
                      type="button"
                      className="ctl race__replay"
                      onClick={() => onReplay(entry)}
                      disabled={busy}
                    >
                      Replay
                    </button>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
