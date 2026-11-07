import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Replays a solver trace across the grid.
 *
 * The animation deliberately bypasses React: re-rendering a few thousand cells
 * sixty times a second is exactly the kind of work that makes a visualizer feel
 * cheap. Instead each cell registers its DOM node once and the loop writes
 * `data-state` straight onto the element, which CSS styles. React still owns
 * the structural class (wall / weight / endpoint), so the two never fight.
 */
export function useAnimator({ cellsRef, onFinish }) {
  const frameRef = useRef(0);
  const stateRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | running | paused | done
  const [progress, setProgress] = useState(0);
  const finishRef = useRef(onFinish);

  useEffect(() => {
    finishRef.current = onFinish;
  }, [onFinish]);

  const paint = useCallback(
    (id, value) => {
      const node = cellsRef.current?.[id];
      if (node) node.dataset.state = value;
    },
    [cellsRef],
  );

  /** Wipes every search overlay, leaving walls, weights and endpoints alone. */
  const clearTrace = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    stateRef.current = null;
    for (const node of cellsRef.current ?? []) {
      if (node?.dataset.state) node.dataset.state = '';
    }
    setPhase('idle');
    setProgress(0);
  }, [cellsRef]);

  const finish = useCallback(() => {
    const run = stateRef.current;
    if (!run) return;

    // Paint whatever is left in one go, then hand back control.
    for (let i = run.visitedIndex; i < run.visited.length; i += 1) paint(run.visited[i], 'visited');
    for (let i = run.pathIndex; i < run.path.length; i += 1) paint(run.path[i], 'path');

    run.visitedIndex = run.visited.length;
    run.pathIndex = run.path.length;
    cancelAnimationFrame(frameRef.current);
    stateRef.current = null;
    setPhase('done');
    setProgress(1);
    finishRef.current?.();
  }, [paint]);

  const step = useCallback(
    (timestamp) => {
      const run = stateRef.current;
      if (!run) return;

      const elapsed = run.lastFrame ? timestamp - run.lastFrame : 16;
      run.lastFrame = timestamp;

      // Always advance at least one cell so a slow speed still makes progress.
      const budget = Math.max(1, Math.round((run.cellsPerSecond * elapsed) / 1000));
      let drawn = 0;

      while (drawn < budget && run.visitedIndex < run.visited.length) {
        paint(run.visited[run.visitedIndex], 'visited');
        run.visitedIndex += 1;
        drawn += 1;
      }

      // The path is the payoff, so it is always traced at a readable pace.
      if (run.visitedIndex >= run.visited.length) {
        const pathBudget = Math.max(1, Math.round(budget / 4));
        let pathDrawn = 0;
        while (pathDrawn < pathBudget && run.pathIndex < run.path.length) {
          paint(run.path[run.pathIndex], 'path');
          run.pathIndex += 1;
          pathDrawn += 1;
        }
      }

      const total = run.visited.length + run.path.length;
      setProgress(total === 0 ? 1 : (run.visitedIndex + run.pathIndex) / total);

      if (run.visitedIndex >= run.visited.length && run.pathIndex >= run.path.length) {
        stateRef.current = null;
        setPhase('done');
        setProgress(1);
        finishRef.current?.();
        return;
      }

      frameRef.current = requestAnimationFrame(step);
    },
    [paint],
  );

  const play = useCallback(
    (result, cellsPerSecond) => {
      cancelAnimationFrame(frameRef.current);
      for (const node of cellsRef.current ?? []) {
        if (node?.dataset.state) node.dataset.state = '';
      }

      stateRef.current = {
        visited: result.visitedOrder,
        path: result.path,
        visitedIndex: 0,
        pathIndex: 0,
        cellsPerSecond,
        lastFrame: 0,
      };

      setProgress(0);

      if (!Number.isFinite(cellsPerSecond)) {
        setPhase('running');
        finish();
        return;
      }

      setPhase('running');
      frameRef.current = requestAnimationFrame(step);
    },
    [cellsRef, finish, step],
  );

  const pause = useCallback(() => {
    if (!stateRef.current) return;
    cancelAnimationFrame(frameRef.current);
    stateRef.current.lastFrame = 0;
    setPhase('paused');
  }, []);

  const resume = useCallback(() => {
    if (!stateRef.current) return;
    setPhase('running');
    frameRef.current = requestAnimationFrame(step);
  }, [step]);

  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  return {
    phase,
    progress,
    isBusy: phase === 'running' || phase === 'paused',
    play,
    pause,
    resume,
    skip: finish,
    clearTrace,
  };
}
