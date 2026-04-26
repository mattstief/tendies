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
  mostControversial: { name: string; stdDev: number } | null;
  crowdPleaser: { name: string; stdDev: number } | null;
  contrarian: { username: string; matchScore: number } | null;
  generousRater: { username: string; avg: number } | null;
  harshCritic: { username: string; avg: number } | null;
  onDismiss: () => void;
}

type Phase = 'drumroll' | 'restaurants' | 'users' | 'awards' | 'done';

const DRUMROLL_MS = 3500;
const CARD_INTERVAL_MS = 1400;
const AWARD_INTERVAL_MS = 1000;
const SECTION_PAUSE_MS = 2000;

export function RevealOverlay({
  restaurants, users,
  mostControversial, crowdPleaser, contrarian,
  generousRater, harshCritic,
  onDismiss,
}: RevealOverlayProps) {
  const [phase, setPhase] = useState<Phase>('drumroll');
  const [visibleR, setVisibleR] = useState(0);
  const [visibleU, setVisibleU] = useState(0);
  const [visibleA, setVisibleA] = useState(0);

  const top3R = restaurants
    .filter((r) => r.average !== null)
    .slice(0, 3)
    .map((r, i) => ({ ...r, rank: i + 1, average: r.average as number }))
    .reverse();

  const top3U = [...users]
    .filter((u) => u.matchScore !== null)
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 3)
    .map((u, i) => ({ ...u, rank: i + 1, matchScore: u.matchScore as number }))
    .reverse();

  const awards = [
    mostControversial && { label: 'Most Controversial', name: mostControversial.name, stat: `±${mostControversial.stdDev.toFixed(1)}`, statColor: '#f05a3a' },
    crowdPleaser      && { label: 'Crowd Pleaser',      name: crowdPleaser.name,      stat: `±${crowdPleaser.stdDev.toFixed(1)}`,      statColor: '#00c8a8' },
    contrarian        && { label: 'The Contrarian',     name: contrarian.username,    stat: `${contrarian.matchScore}%`,               statColor: '#4b7a99' },
    generousRater     && { label: 'Most Generous',      name: generousRater.username, stat: `avg ${generousRater.avg.toFixed(1)}`,     statColor: '#00c8a8' },
    harshCritic       && { label: 'Harshest Critic',    name: harshCritic.username,   stat: `avg ${harshCritic.avg.toFixed(1)}`,       statColor: '#f05a3a' },
  ].filter(Boolean) as Array<{ label: string; name: string; stat: string; statColor: string }>;

  useEffect(() => {
    const t = setTimeout(() => setPhase('restaurants'), DRUMROLL_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== 'restaurants') return;
    const timers = top3R.map((_, i) =>
      setTimeout(() => setVisibleR(i + 1), i * CARD_INTERVAL_MS)
    );
    const done = setTimeout(() => setPhase('users'), top3R.length * CARD_INTERVAL_MS + SECTION_PAUSE_MS);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'users') return;
    const timers = top3U.map((_, i) =>
      setTimeout(() => setVisibleU(i + 1), i * CARD_INTERVAL_MS)
    );
    const done = setTimeout(() => setPhase('awards'), top3U.length * CARD_INTERVAL_MS + SECTION_PAUSE_MS);
    return () => { timers.forEach(clearTimeout); clearTimeout(done); };
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (phase !== 'awards') return;
    const timers = awards.map((_, i) =>
      setTimeout(() => setVisibleA(i + 1), i * AWARD_INTERVAL_MS)
    );
    const done = setTimeout(() => setPhase('done'), awards.length * AWARD_INTERVAL_MS + SECTION_PAUSE_MS);
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

          {(phase === 'users' || phase === 'awards' || phase === 'done') && (
            <div className="reveal-section">
              <p className="reveal-section-label">Top Rankers</p>
              {top3U.slice(0, visibleU).map((u) => (
                <div key={u.username} className={`reveal-card ${u.rank === 1 ? 'reveal-card-first' : ''}`}>
                  <span className="reveal-rank" style={u.rank === 1 ? { color: '#00c8a8' } : undefined}>
                    #{u.rank}
                  </span>
                  <span className="reveal-card-name">{u.username}</span>
                  <span className="reveal-card-score" style={{ color: '#00c8a8' }}>
                    {u.matchScore}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {(phase === 'awards' || phase === 'done') && awards.length > 0 && (
            <div className="reveal-section">
              <p className="reveal-section-label">Special Awards</p>
              {awards.slice(0, visibleA).map((award) => (
                <div key={award.label} className="reveal-card">
                  <div style={{ flex: 1 }}>
                    <div className="reveal-award-label">{award.label}</div>
                    <div className="reveal-card-name">{award.name}</div>
                  </div>
                  <span className="reveal-card-score" style={{ color: award.statColor }}>
                    {award.stat}
                  </span>
                </div>
              ))}
            </div>
          )}

          {phase === 'done' && (
            <button className="btn-primary" style={{ maxWidth: 320, marginTop: 8 }} onClick={onDismiss}>
              See Full Results
            </button>
          )}
        </>
      )}
    </div>
  );
}
