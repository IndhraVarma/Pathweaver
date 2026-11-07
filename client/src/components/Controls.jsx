import { SPEEDS } from '../lib/board.js';

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="micro">{label}</span>
      <span className="field__control">{children}</span>
    </label>
  );
}

export function Controls({
  catalogue,
  algorithm,
  onAlgorithm,
  speed,
  onSpeed,
  maze,
  onMaze,
  onGenerate,
  onRun,
  onRace,
  onClearPath,
  onClearBoard,
  allowDiagonal,
  onDiagonal,
  animator,
  busy,
}) {
  const running = animator.phase === 'running';
  const paused = animator.phase === 'paused';

  return (
    <div className="controls">
      <div className="controls__row">
        <Field label="Algorithm">
          <select
            className="select"
            value={algorithm}
            onChange={(event) => onAlgorithm(event.target.value)}
            disabled={busy}
          >
            {catalogue.algorithms.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Pace">
          <select
            className="select"
            value={speed}
            onChange={(event) => onSpeed(event.target.value)}
          >
            {SPEEDS.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Generate">
          <span className="field__pair">
            <select
              className="select"
              value={maze}
              onChange={(event) => onMaze(event.target.value)}
              disabled={busy}
            >
              {catalogue.mazes.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
            <button type="button" className="ctl" onClick={onGenerate} disabled={busy}>
              Build
            </button>
          </span>
        </Field>
      </div>

      <div className="controls__row controls__row--actions">
        <button type="button" className="ctl ctl--primary" onClick={onRun} disabled={busy}>
          Visualise search
        </button>

        <button type="button" className="ctl" onClick={onRace} disabled={busy}>
          Race all six
        </button>

        {animator.isBusy && (
          <button
            type="button"
            className="ctl"
            onClick={running ? animator.pause : animator.resume}
          >
            {running ? 'Pause' : 'Resume'}
          </button>
        )}

        {animator.isBusy && (
          <button type="button" className="ctl" onClick={animator.skip}>
            Skip to end
          </button>
        )}

        <button type="button" className="ctl" onClick={onClearPath} disabled={running || paused}>
          Clear trace
        </button>

        <button type="button" className="ctl" onClick={onClearBoard} disabled={busy}>
          Clear board
        </button>

        <button
          type="button"
          className="ctl"
          aria-pressed={allowDiagonal}
          onClick={() => onDiagonal(!allowDiagonal)}
          disabled={busy}
        >
          Diagonals
        </button>
      </div>
    </div>
  );
}
