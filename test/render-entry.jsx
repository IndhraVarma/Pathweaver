/**
 * Render harness for `render.test.mjs`.
 *
 * Bundled by esbuild at test time and rendered with react-dom/server, which
 * catches anything that would throw on a component's first paint without
 * needing a browser or a DOM implementation.
 */
import { renderToStaticMarkup } from 'react-dom/server';

import { SiteHeader } from '../client/src/components/SiteHeader.jsx';
import { Hero } from '../client/src/components/Hero.jsx';
import { Visualizer } from '../client/src/components/Visualizer.jsx';
import { AlgorithmsSection } from '../client/src/components/AlgorithmsSection.jsx';
import { BenchmarksSection } from '../client/src/components/BenchmarksSection.jsx';
import { SiteFooter } from '../client/src/components/SiteFooter.jsx';
import { RaceResults } from '../client/src/components/RaceResults.jsx';
import { ALGORITHMS } from '../shared/algorithms.js';
import { MAZE_TYPES } from '../shared/mazes.js';

const catalogue = { algorithms: ALGORITHMS, mazes: MAZE_TYPES };

export function render() {
  return {
    header: renderToStaticMarkup(<SiteHeader />),
    hero: renderToStaticMarkup(<Hero sectionLabel="Experiment 001 / The grid" counter="01 — 05" />),
    visualizer: renderToStaticMarkup(<Visualizer catalogue={catalogue} />),
    algorithms: renderToStaticMarkup(<AlgorithmsSection catalogue={catalogue} />),
    benchmarks: renderToStaticMarkup(<BenchmarksSection catalogue={catalogue} refreshToken={0} />),
    footer: renderToStaticMarkup(
      <SiteFooter health={{ version: '1.0.0', uptimeSeconds: 120 }} />,
    ),
    race: renderToStaticMarkup(
      <RaceResults
        catalogue={catalogue}
        busy={false}
        onReplay={() => {}}
        results={[
          {
            algorithm: 'astar',
            found: true,
            stats: { visited: 120, pathLength: 30, pathCost: 29, elapsedMs: 1.2 },
          },
          {
            algorithm: 'bfs',
            found: true,
            stats: { visited: 400, pathLength: 30, pathCost: 36, elapsedMs: 0.9 },
          },
          {
            algorithm: 'dfs',
            found: false,
            stats: { visited: 500, pathLength: 0, pathCost: 0, elapsedMs: 1.1 },
          },
        ]}
      />,
    ),
  };
}
