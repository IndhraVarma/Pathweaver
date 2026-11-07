const LEGEND = [
  { kind: 'start', label: 'Start' },
  { kind: 'end', label: 'Goal' },
  { kind: 'wall', label: 'Wall' },
  { kind: 'weight', label: 'Weighted ground' },
  { kind: 'visited', label: 'Searched' },
  { kind: 'path', label: 'Path' },
];

function Stat({ label, value, hint }) {
  return (
    <div className="stat">
      <span className="micro">{label}</span>
      <span className="stat__value">{value}</span>
      {hint && <span className="stat__hint">{hint}</span>}
    </div>
  );
}

export function Legend() {
  return (
    <ul className="legend">
      {LEGEND.map((entry) => (
        <li key={entry.kind} className="legend__item">
          <span className={`legend__swatch legend__swatch--${entry.kind}`} aria-hidden="true" />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

/** The readout under the grid: last run, plus a live region for screen readers. */
export function StatsBar({ result, algorithmName, source }) {
  if (!result) {
    return (
      <div className="stats stats--empty">
        <p className="micro">
          Drag on the grid to build walls · hold shift for weighted ground · drag the markers to move them
        </p>
      </div>
    );
  }

  const { stats, found } = result;

  return (
    <div className="stats">
      <Stat label="Algorithm" value={algorithmName} />
      <Stat
        label="Outcome"
        value={found ? 'Path found' : 'No route'}
        hint={found ? undefined : 'the goal is walled off'}
      />
      <Stat label="Cells searched" value={stats.visited.toLocaleString()} hint={`${Math.round(stats.explorationRatio * 100)}% of the board`} />
      <Stat label="Path steps" value={found ? stats.pathLength.toLocaleString() : '—'} />
      <Stat label="Path cost" value={found ? stats.pathCost.toLocaleString() : '—'} hint="weighted ground costs 8" />
      <Stat label="Solve time" value={`${stats.elapsedMs} ms`} hint={source === 'local' ? 'in browser' : 'on the server'} />

      <p className="visually-hidden" role="status">
        {found
          ? `${algorithmName} found a path of ${stats.pathLength} steps costing ${stats.pathCost}, after searching ${stats.visited} cells in ${stats.elapsedMs} milliseconds.`
          : `${algorithmName} searched ${stats.visited} cells and found no route to the goal.`}
      </p>
    </div>
  );
}
