import { LogoMark } from './SiteHeader.jsx';

export function SiteFooter({ health }) {
  return (
    <footer className="site-footer" id="colophon">
      <div className="shell">
        <div className="site-footer__top">
          <p className="micro">05 / Colophon</p>
          <h2 className="section__title site-footer__title">
            Built to be <span className="accent">read.</span>
          </h2>
        </div>

        <div className="site-footer__grid">
          <div className="site-footer__block">
            <p className="micro">How it works</p>
            <p className="site-footer__text">
              One algorithm core, shared verbatim between the Express API and the React client. The
              server solves every board and returns the full settle order, so what animates on screen
              is the real search, replayed — not an approximation of it.
            </p>
          </div>

          <div className="site-footer__block">
            <p className="micro">Keyboard & pointer</p>
            <ul className="site-footer__list">
              <li>Drag to draw walls</li>
              <li>Shift-drag for weighted ground</li>
              <li>Drag the markers to move start and goal</li>
              <li>Drag over a wall again to erase it</li>
            </ul>
          </div>

          <div className="site-footer__block">
            <p className="micro">Service</p>
            <ul className="site-footer__list">
              <li>
                API{' '}
                <span className={`dot dot--${health ? 'up' : 'down'}`} aria-hidden="true" />
                {health ? 'reachable' : 'not reachable'}
              </li>
              {health && <li>Version {health.version}</li>}
              {health && <li>Up {Math.round(health.uptimeSeconds / 60)} min</li>}
            </ul>
          </div>
        </div>

        <div className="site-footer__base">
          <span className="wordmark">
            <LogoMark size={26} />
            <span className="wordmark__text">PATHWEAVER</span>
          </span>
          <p className="micro">Experiment 001 / The grid</p>
        </div>
      </div>
    </footer>
  );
}
