import { useCallback, useRef, useState } from 'react';

import { Controls } from './Controls.jsx';
import { Grid } from './Grid.jsx';
import { Legend, StatsBar } from './StatsBar.jsx';
import { RaceResults } from './RaceResults.jsx';
import { ScenarioShelf } from './ScenarioShelf.jsx';
import { useBoard } from '../hooks/useBoard.js';
import { useAnimator } from '../hooks/useAnimator.js';
import { DEFAULT_SPEED, SPEEDS, toPayload } from '../lib/board.js';
import * as api from '../lib/api.js';

export function Visualizer({ catalogue }) {
  const { board, resize, paint, moveEndpoint, applyMaze, clearObstacles, setAllowDiagonal, loadBoard, kindOf } =
    useBoard();

  const cellsRef = useRef([]);
  const animator = useAnimator({ cellsRef });

  const [algorithm, setAlgorithm] = useState(catalogue.algorithms[0]?.id ?? 'astar');
  const [maze, setMaze] = useState(catalogue.mazes[0]?.id ?? 'recursive-division');
  const [speed, setSpeed] = useState(DEFAULT_SPEED);
  const [result, setResult] = useState(null);
  const [race, setRace] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const busy = pending || animator.isBusy;
  const cellsPerSecond = SPEEDS.find((entry) => entry.id === speed)?.cellsPerSecond ?? 220;
  const nameOf = (id) => catalogue.algorithms.find((entry) => entry.id === id)?.name ?? id;

  const run = useCallback(
    async (compare) => {
      setPending(true);
      setError('');
      animator.clearTrace();

      try {
        const payload = { ...toPayload(board), algorithm };
        const { results, source } = await api.solveBoard(payload, { compare });

        if (compare) {
          setRace({ results, source });
          const chosen = results.find((entry) => entry.algorithm === algorithm) ?? results[0];
          setResult({ ...chosen, source });
          animator.play(chosen, cellsPerSecond);
        } else {
          setRace(null);
          setResult({ ...results[0], source });
          animator.play(results[0], cellsPerSecond);
        }
      } catch (requestError) {
        setError(requestError.message ?? 'The search could not be run.');
      } finally {
        setPending(false);
      }
    },
    [algorithm, animator, board, cellsPerSecond],
  );

  const replay = useCallback(
    (entry) => {
      setAlgorithm(entry.algorithm);
      setResult({ ...entry, source: race?.source });
      animator.play(entry, cellsPerSecond);
    },
    [animator, cellsPerSecond, race],
  );

  const generate = useCallback(async () => {
    setPending(true);
    setError('');
    animator.clearTrace();
    setResult(null);
    setRace(null);

    try {
      const generated = await api.requestMaze({
        type: maze,
        rows: board.rows,
        cols: board.cols,
        start: board.start,
        end: board.end,
      });
      applyMaze(generated);
    } catch (requestError) {
      setError(requestError.message ?? 'The maze could not be generated.');
    } finally {
      setPending(false);
    }
  }, [animator, applyMaze, board.cols, board.end, board.rows, board.start, maze]);

  const clearTrace = useCallback(() => {
    animator.clearTrace();
    setResult(null);
    setRace(null);
  }, [animator]);

  const clearBoard = useCallback(() => {
    clearTrace();
    clearObstacles();
  }, [clearObstacles, clearTrace]);

  const restore = useCallback(
    (grid) => {
      clearTrace();
      loadBoard(grid);
    },
    [clearTrace, loadBoard],
  );

  return (
    <section className="section section--grid" id="grid">
      <div className="shell">
        <header className="section__head">
          <p className="micro">02 / The grid</p>
          <h2 className="section__title">
            Draw a room.
            <br />
            Then watch it <span className="accent">solved.</span>
          </h2>
          <p className="section__lede">
            Every search runs against the same board you just drew. Weighted ground costs eight times
            an ordinary step, which is where the algorithms start to part company.
          </p>
        </header>

        <Controls
          catalogue={catalogue}
          algorithm={algorithm}
          onAlgorithm={setAlgorithm}
          speed={speed}
          onSpeed={setSpeed}
          maze={maze}
          onMaze={setMaze}
          onGenerate={generate}
          onRun={() => run(false)}
          onRace={() => run(true)}
          onClearPath={clearTrace}
          onClearBoard={clearBoard}
          allowDiagonal={board.allowDiagonal}
          onDiagonal={setAllowDiagonal}
          animator={animator}
          busy={busy}
        />

        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}

        {result?.source === 'local' && (
          <p className="notice" role="status">
            The API server is not reachable, so the search ran in your browser instead — same code,
            same result.
          </p>
        )}

        <Grid
          board={board}
          kindOf={kindOf}
          paint={paint}
          moveEndpoint={moveEndpoint}
          resize={resize}
          cellsRef={cellsRef}
          locked={busy}
        />

        <div className="grid-foot">
          <Legend />
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={Math.round(animator.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Search replay progress"
          >
            <span className="progress__fill" style={{ '--fill': `${animator.progress * 100}%` }} />
          </div>
        </div>

        <StatsBar result={result} algorithmName={nameOf(result?.algorithm ?? algorithm)} source={result?.source} />

        {race && (
          <RaceResults
            results={race.results}
            catalogue={catalogue}
            onReplay={replay}
            busy={busy}
          />
        )}

        <ScenarioShelf board={toPayload(board)} onLoad={restore} busy={busy} />
      </div>
    </section>
  );
}
