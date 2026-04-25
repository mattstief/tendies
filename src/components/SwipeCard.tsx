'use client';

import { useRef } from 'react';
import { scoreToColor } from '@/lib/colors';

interface SwipeCardProps {
  score: number;
  onChange: (score: number) => void;
}

const SWIPE_STEP_PX = 40;

export function SwipeCard({ score, onChange }: SwipeCardProps) {
  const startX = useRef<number | null>(null);
  const startScore = useRef(score);

  function clamp(n: number) {
    return Math.max(1, Math.min(10, n));
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startScore.current = score;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    const steps = Math.floor(Math.abs(diff) / SWIPE_STEP_PX);
    const direction = diff > 0 ? 1 : -1;
    const next = clamp(startScore.current + direction * steps);
    if (next !== score) onChange(next);
  }

  function onTouchEnd() {
    startX.current = null;
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ userSelect: 'none', touchAction: 'pan-y' }}
      className="swipe-card"
    >
      <button
        className="swipe-arrow"
        onClick={() => onChange(clamp(score - 1))}
        aria-label="Decrease score"
      >
        ←
      </button>
      <div className="swipe-score" style={{ color: scoreToColor(score) }}>{score}</div>
      <button
        className="swipe-arrow"
        onClick={() => onChange(clamp(score + 1))}
        aria-label="Increase score"
      >
        →
      </button>
    </div>
  );
}
