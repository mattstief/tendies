'use client';

import { useEffect, useState } from 'react';
import { scoreToColor } from '@/lib/colors';

interface RestaurantRow {
  name: string;
  average: number | null;
}

interface UserRow {
  username: string;
  matchScore: number | null;
}

interface RevealOverlayProps {
  restaurants: RestaurantRow[];
  users: UserRow[];
}

type Phase = 'drumroll' | 'restaurants' | 'users' | 'done';

const DRUMROLL_MS = 3500;
const CARD_INTERVAL_MS = 1400;
const SECTION_PAUSE_MS = 2000;

export function RevealOverlay({ restaurants, users }: RevealOverlayProps) {
  const [phase, setPhase] = useState<Phase>('drumroll');
  const [visibleR, setVisibleR] = useState(0);
  const [visibleU, setVisibleU] = useState(0);

  const top3R = restaurants
    .filter((r) => r.average !== null)
    .slice(0, 3)
    .map((r, i) => ({ ...r, rank: i + 1, average: r.average as number }))
    .reverse(); // reveal 3rd → 2nd → 1st

  const top3U = [...users]
    .filter((u) => u.matchScore !== null)
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 3)
    .map((u, i) => ({ ...u, rank: i + 1, matchScore: u.matchScore as number }))
    .reverse(); // reveal 3rd → 2nd → 1st

  useEffect(() => {
    const t = setTimeout(() => setPhase('restaurants'), DRUMROLL_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'restaurants') return;
    const timers = top3R.map((_, i) =>
      setTimeout(() => setVisibleR(i + 1), i * CARD_INTERVAL_MS)
    );
    const done = setTimeout(
      () => setPhase('users'),
      top3R.length * CARD_INTERVAL_MS + SECTION_PAUSE_MS
    );
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'users') return;
    const timers = top3U.map((_, i) =>
      setTimeout(() => setVisibleU(i + 1), i * CARD_INTERVAL_MS)
    );
    const done = setTimeout(
      () => setPhase('done'),
      top3U.length * CARD_INTERVAL_MS + SECTION_PAUSE_MS
    );
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="reveal-overlay">
      <h1 className="reveal-heading">The Results Are In</h1>

      {phase === 'drumroll' && (
        <div className="reveal-drumroll">
          <p className="reveal-drumroll-text">Calculating the winners</p>
          <div className="reveal-dots">
            <span className="reveal-dot" />
            <span className="reveal-dot" />
            <span className="reveal-dot" />
          </div>
        </div>
      )}

      {phase !== 'drumroll' && (
        <>
          <div className="reveal-section">
            <p className="reveal-section-label">Top Tendies</p>
            {top3R.slice(0, visibleR).map((r) => (
              <div key={r.name} className={`reveal-card ${r.rank === 1 ? 'reveal-card-first' : ''}`}>
                <span className="reveal-rank" style={r.rank === 1 ? { color: scoreToColor(r.average) } : undefined}>
                  #{r.rank}
                </span>
                <span className="reveal-card-name">{r.name}</span>
                <span className="reveal-card-score" style={{ color: scoreToColor(r.average) }}>
                  {r.average.toFixed(1)}
                </span>
              </div>
            ))}
          </div>

          {(phase === 'users' || phase === 'done') && (
            <div className="reveal-section">
              <p className="reveal-section-label">Top Rankers</p>
              {top3U.slice(0, visibleU).map((u) => (
                <div key={u.username} className={`reveal-card ${u.rank === 1 ? 'reveal-card-first' : ''}`}>
                  <span className="reveal-rank" style={u.rank === 1 ? { color: 'var(--accent)' } : undefined}>
                    #{u.rank}
                  </span>
                  <span className="reveal-card-name">{u.username}</span>
                  <span className="reveal-card-score" style={{ color: 'var(--accent)' }}>
                    {u.matchScore}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
