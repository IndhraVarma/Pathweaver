import { useEffect, useState } from 'react';

const NAV = [
  { href: '#grid', label: 'The grid' },
  { href: '#algorithms', label: 'Algorithms' },
  { href: '#benchmarks', label: 'Benchmarks' },
];

/** The orbital mark: three rings around a lit core, matching the hero object. */
export function LogoMark({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="4.2" fill="url(#mark-core)" />
      <ellipse cx="20" cy="20" rx="17.5" ry="7" stroke="currentColor" strokeWidth="1.3" opacity="0.9" />
      <ellipse
        cx="20"
        cy="20"
        rx="17.5"
        ry="7"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.6"
        transform="rotate(60 20 20)"
      />
      <ellipse
        cx="20"
        cy="20"
        rx="17.5"
        ry="7"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.6"
        transform="rotate(120 20 20)"
      />
      <defs>
        <radialGradient id="mark-core" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0%" stopColor="#efdcff" />
          <stop offset="100%" stopColor="#8d5fc0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function SiteHeader() {
  const [lifted, setLifted] = useState(false);

  // The rule under the header only appears once the hero starts sliding away.
  useEffect(() => {
    const onScroll = () => setLifted(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`site-header${lifted ? ' site-header--lifted' : ''}`}>
      <div className="site-header__inner shell">
        <a className="wordmark" href="#top">
          <LogoMark />
          <span className="wordmark__text">
            PATHWEAVER<sup>®</sup>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} className="site-nav__link" href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <a className="pill" href="#grid">
          Start a search
          <span className="pill__arrow" aria-hidden="true">
            ↗
          </span>
        </a>
      </div>
    </header>
  );
}
