import { useState } from 'react';

import { Orbital } from './Orbital.jsx';

export function Hero({ sectionLabel, counter }) {
  const [paused, setPaused] = useState(false);

  return (
    <section className="hero" id="top">
      <div className="hero__inner shell">
        <div className="hero__copy">
          <p className="micro">Six algorithms. One grid. No guesswork.</p>

          <h1 className="hero__title">
            Find the way,
            <br />
            <span className="accent">beautifully.</span>
          </h1>

          <p className="hero__lede">
            Draw a wall. Pour costly terrain. Then watch six classic search
            algorithms negotiate the very same room — and disagree.
          </p>

          <a className="orb-button" href="#grid">
            <span className="orb-button__ring" aria-hidden="true">
              ↗
            </span>
            <span className="orb-button__label">Enter the grid</span>
          </a>
        </div>

        <div className="hero__object">
          <Orbital paused={paused} />
        </div>
      </div>

      <div className="hero__footer shell">
        <p className="micro">{sectionLabel}</p>

        <a className="hero__scroll" href="#grid">
          <span className="micro micro--cream">Scroll to discover</span>
          <span className="hero__chevron" aria-hidden="true">
            ⌄
          </span>
        </a>

        <div className="hero__index">
          <span className="micro">{counter}</span>
          <button
            type="button"
            className="hero__pause"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
          >
            <span className="visually-hidden">
              {paused ? 'Resume the hero animation' : 'Pause the hero animation'}
            </span>
            <span aria-hidden="true">{paused ? '▶' : '❚❚'}</span>
          </button>
        </div>
      </div>
    </section>
  );
}
