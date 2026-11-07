import { useEffect, useState } from 'react';

import { SiteHeader } from './components/SiteHeader.jsx';
import { Hero } from './components/Hero.jsx';
import { Visualizer } from './components/Visualizer.jsx';
import { AlgorithmsSection } from './components/AlgorithmsSection.jsx';
import { BenchmarksSection } from './components/BenchmarksSection.jsx';
import { SiteFooter } from './components/SiteFooter.jsx';
import { useSectionCounter } from './hooks/useSectionCounter.js';
import * as api from './lib/api.js';

import './styles/global.css';
import './styles/hero.css';
import './styles/visualizer.css';
import './styles/sections.css';

const SECTIONS = [
  { id: 'top', label: 'Experiment 001 / The grid' },
  { id: 'grid', label: 'Experiment 002 / The board' },
  { id: 'algorithms', label: 'Experiment 003 / The cast' },
  { id: 'benchmarks', label: 'Experiment 004 / The record' },
  { id: 'colophon', label: 'Experiment 005 / Colophon' },
];

export default function App() {
  const [catalogue, setCatalogue] = useState(null);
  const [health, setHealth] = useState(null);
  const { index } = useSectionCounter(SECTIONS.map((section) => section.id));

  useEffect(() => {
    api.fetchCatalogue().then(setCatalogue);
    api.fetchHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  if (!catalogue) {
    return (
      <div className="boot" role="status">
        <span className="boot__pulse" aria-hidden="true" />
        <p className="micro">Loading the grid…</p>
      </div>
    );
  }

  const counter = `${String(index + 1).padStart(2, '0')} — ${String(SECTIONS.length).padStart(2, '0')}`;

  return (
    <>
      <SiteHeader />
      <main>
        <Hero sectionLabel={SECTIONS[index].label} counter={counter} />
        <Visualizer catalogue={catalogue} />
        <AlgorithmsSection catalogue={catalogue} />
        <BenchmarksSection catalogue={catalogue} />
      </main>
      <SiteFooter health={health} />
    </>
  );
}
