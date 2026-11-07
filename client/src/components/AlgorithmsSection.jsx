const GUARANTEE_COPY = {
  shortest: 'Guarantees the cheapest route',
  'fewest-steps': 'Guarantees the fewest steps',
  none: 'No guarantee of optimality',
};

export function AlgorithmsSection({ catalogue }) {
  return (
    <section className="section section--algorithms" id="algorithms">
      <div className="shell">
        <header className="section__head">
          <p className="micro">03 / The cast</p>
          <h2 className="section__title">
            Six ways to cross <span className="accent">one room.</span>
          </h2>
          <p className="section__lede">
            An informed search knows roughly where the goal is and leans towards it. An uninformed
            one does not, and pays for it in cells searched.
          </p>
        </header>

        <ol className="cast">
          {catalogue.algorithms.map((entry, index) => (
            <li key={entry.id} className="cast__item">
              <span className="cast__index micro">{String(index + 1).padStart(2, '0')}</span>
              <div className="cast__body">
                <h3 className="cast__name">{entry.name}</h3>
                <p className="cast__blurb">{entry.blurb}</p>
              </div>
              <ul className="cast__tags">
                <li className={`tag tag--${entry.kind}`}>{entry.kind}</li>
                <li className="tag">{entry.weighted ? 'reads terrain cost' : 'ignores terrain cost'}</li>
                <li className="tag">{GUARANTEE_COPY[entry.guarantee]}</li>
              </ul>
            </li>
          ))}
        </ol>

        <div className="cast__mazes">
          <p className="micro">Board generators</p>
          <ul className="maze-list">
            {catalogue.mazes.map((entry) => (
              <li key={entry.id} className="maze-list__item">
                <h4 className="maze-list__name">{entry.name}</h4>
                <p className="maze-list__blurb">{entry.blurb}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
