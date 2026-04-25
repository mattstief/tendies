'use client';

import { useState } from 'react';

interface Pair {
  a: string;
  b: string;
  score: number;
}

interface TiebreakerSheetProps {
  pairs: Pair[];
  onComplete: (results: Array<{ a: string; b: string; winner: string }>) => void;
}

export function TiebreakerSheet({ pairs, onComplete }: TiebreakerSheetProps) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Array<{ a: string; b: string; winner: string }>>([]);

  const current = pairs[index];

  function pick(winner: string) {
    const next = [...results, { a: current.a, b: current.b, winner }];
    if (index + 1 >= pairs.length) {
      onComplete(next);
    } else {
      setResults(next);
      setIndex(index + 1);
    }
  }

  return (
    <div className="sheet-overlay">
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-progress">
          Matchup {index + 1} of {pairs.length}
        </p>
        <p className="sheet-hint">Both rated {current.score} — pick your favorite</p>

        <div className="tiebreaker-card" onClick={() => pick(current.a)}>
          <div>
            <div className="card-name">{current.a}</div>
            <div className="card-score">rated {current.score}</div>
          </div>
          <button className="btn-primary btn-sm">Pick this</button>
        </div>

        <div className="tiebreaker-vs">VS</div>

        <div className="tiebreaker-card" onClick={() => pick(current.b)}>
          <div>
            <div className="card-name">{current.b}</div>
            <div className="card-score">rated {current.score}</div>
          </div>
          <button className="btn-primary btn-sm">Pick this</button>
        </div>

        <button className="btn-ghost" onClick={() => pick('tie')}>
          They&apos;re equal — keep the tie
        </button>
      </div>
    </div>
  );
}
