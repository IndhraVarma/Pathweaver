import { useEffect, useState } from 'react';

/**
 * Tracks which section is currently in view, driving the "01 — 05" counter in
 * the hero footer. The rootMargin biases the decision towards the section
 * occupying the middle of the viewport rather than merely touching its edge.
 */
export function useSectionCounter(ids) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (elements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;
        const next = ids.indexOf(visible.target.id);
        if (next >= 0) setIndex(next);
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 1] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps -- ids is a literal list

  return { index };
}
