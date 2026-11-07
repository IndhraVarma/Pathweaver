/**
 * The hero object: three gradient tori drifting around a lit core, resting on
 * a dark plinth inside a wide arc.
 *
 * Built from masked CSS gradients rather than a WebGL scene — it holds the
 * exact look at a fraction of the weight, costs no extra dependency, and
 * degrades to a still image when the visitor prefers reduced motion.
 */
export function Orbital({ paused = false }) {
  return (
    <div className={`orbital${paused ? ' orbital--paused' : ''}`} aria-hidden="true">
      <div className="orbital__glow" />
      <div className="orbital__arc" />

      <div className="orbital__halo">
        <span className="orbital__bead orbital__bead--silver" />
        <span className="orbital__bead orbital__bead--bronze" />
      </div>

      <div className="orbital__stage">
        <div className="orbital__ring orbital__ring--gold-outer">
          <span className="orbital__torus" />
        </div>
        <div className="orbital__ring orbital__ring--silver">
          <span className="orbital__torus" />
        </div>
        <div className="orbital__ring orbital__ring--gold-inner">
          <span className="orbital__torus" />
        </div>
        <div className="orbital__core" />
      </div>

      <div className="orbital__plinth">
        <span className="orbital__plinth-top" />
      </div>
    </div>
  );
}
