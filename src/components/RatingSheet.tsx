'use client';

import { useState } from 'react';
import { SwipeCard } from './SwipeCard';

interface RatingSheetProps {
  restaurant: string;
  existingScore?: number;
  onSubmit: (score: number) => void;
  onClose: () => void;
}

export function RatingSheet({ restaurant, existingScore, onSubmit, onClose }: RatingSheetProps) {
  const [score, setScore] = useState(existingScore ?? 5);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">{restaurant}</h2>
        <p className="sheet-hint">← swipe to score →</p>
        <SwipeCard score={score} onChange={setScore} />
        <button className="btn-primary" onClick={() => onSubmit(score)}>
          Submit {score}/10
        </button>
      </div>
    </div>
  );
}
