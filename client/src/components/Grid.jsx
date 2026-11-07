import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { CELL_SIZE, CELL_SIZE_COMPACT, fitDimensions } from '../lib/board.js';

const Cell = memo(function Cell({ id, kind, register }) {
  return <div className={`cell cell--${kind}`} data-id={id} ref={(node) => register(id, node)} />;
});

/**
 * The editable board.
 *
 * Pointer position is resolved with `elementFromPoint` rather than per-cell
 * enter handlers: one listener on the container covers mouse and touch alike,
 * and a thousand cells do not each need their own.
 */
export function Grid({ board, kindOf, paint, moveEndpoint, resize, cellsRef, locked }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const [cell, setCell] = useState(CELL_SIZE);

  const register = useCallback(
    (id, node) => {
      cellsRef.current[id] = node;
    },
    [cellsRef],
  );

  // Fit the grid to whatever room the layout gives it.
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;

    const measure = () => {
      const { width } = element.getBoundingClientRect();
      const compact = window.innerWidth < 760;
      const height = Math.min(window.innerHeight * 0.62, compact ? 460 : 620);
      const next = fitDimensions(width, height, compact);
      setCell(compact ? CELL_SIZE_COMPACT : CELL_SIZE);
      resize(next.rows, next.cols);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    window.addEventListener('orientationchange', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', measure);
    };
  }, [resize]);

  // The cell registry must shrink when the grid does, or stale nodes linger.
  useEffect(() => {
    cellsRef.current.length = board.rows * board.cols;
  }, [board.rows, board.cols, cellsRef]);

  const idAt = (clientX, clientY) => {
    const element = document.elementFromPoint(clientX, clientY);
    const raw = element?.dataset?.id;
    return raw === undefined ? null : Number(raw);
  };

  const applyAt = useCallback(
    (id) => {
      const drag = dragRef.current;
      if (!drag || id === null) return;

      if (drag.kind === 'start' || drag.kind === 'end') {
        moveEndpoint(drag.kind, id);
        return;
      }

      if (id === drag.lastId) return;
      drag.lastId = id;
      paint(id, drag.mode);
    },
    [moveEndpoint, paint],
  );

  const onPointerDown = (event) => {
    if (locked || event.button === 2) return;

    const id = idAt(event.clientX, event.clientY);
    if (id === null) return;

    const kind = kindOf(id);
    if (kind === 'start' || kind === 'end') {
      dragRef.current = { kind, lastId: id };
    } else {
      // Drawing over something erases it; drawing over blank ground adds.
      const wantsWeight = event.shiftKey || event.altKey;
      const brush = wantsWeight ? 'weight' : 'wall';
      const mode = kind === brush ? 'erase' : brush;
      dragRef.current = { kind: 'paint', mode, lastId: null };
      applyAt(id);
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event) => {
    if (!dragRef.current) return;
    applyAt(idAt(event.clientX, event.clientY));
  };

  const endDrag = (event) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const cells = [];
  for (let id = 0; id < board.rows * board.cols; id += 1) {
    cells.push(<Cell key={id} id={id} kind={kindOf(id)} register={register} />);
  }

  return (
    <div className="grid-frame" ref={containerRef}>
      <div
        className={`grid${locked ? ' grid--locked' : ''}`}
        style={{ '--cols': board.cols, '--cell': `${cell}px` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onContextMenu={(event) => event.preventDefault()}
        role="group"
        aria-label={`Pathfinding grid, ${board.rows} rows by ${board.cols} columns. Drag to draw walls, hold shift to lay weighted terrain, drag the start and goal markers to move them.`}
      >
        {cells}
      </div>
    </div>
  );
}
