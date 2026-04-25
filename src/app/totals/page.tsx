'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { scoreToColor } from '@/lib/colors';
import { RevealOverlay } from '@/components/RevealOverlay';

interface RestaurantRow {
  name: string;
  average: number | null;
  count: number;
}

interface UserRow {
  username: string;
  ratingCount: number;
  matchScore: number | null;
}

interface TotalsData {
  locked?: boolean;
  restaurants: RestaurantRow[];
  users: UserRow[];
  total: number;
  reveal: boolean;
  revealStarted: string | null;
  mostControversial: { name: string; stdDev: number } | null;
  crowdPleaser: { name: string; stdDev: number } | null;
  contrarian: { username: string; matchScore: number } | null;
  generousRater: { username: string; avg: number } | null;
  harshCritic: { username: string; avg: number } | null;
  mostDedicated: { username: string; count: number } | null;
  leastDedicated: { username: string; count: number } | null;
}

export default function TotalsPage() {
  const router = useRouter();
  const [data, setData] = useState<TotalsData | null>(null);
  const [revealSeenTick, setRevealSeenTick] = useState(0); // incremented on dismiss to force re-render

  useEffect(() => {
    async function fetchTotals() {
      const res = await fetch('/api/totals');
      if (res.status === 401) {
        router.replace('/');
        return;
      }
      if (res.ok) setData(await res.json());
    }

    fetchTotals();
    const id = setInterval(fetchTotals, 2000);
    return () => clearInterval(id);
  }, [router]);

  // Derived on every render: check localStorage directly so it reacts to
  // new reveal:started timestamps without any stuck state.
  const revealSeen = !!(
    revealSeenTick >= 0 && // reference tick to re-evaluate after dismiss
    data?.revealStarted &&
    typeof window !== 'undefined' &&
    localStorage.getItem(`tendies_reveal_seen_${data.revealStarted}`) === '1'
  );

  if (!data) {
    return (
      <div className="totals">
        <header className="totals-header">
          <Link href="/" className="btn-ghost btn-sm">← Back</Link>
          <h1 className="totals-title">Aggregate Rankings</h1>
        </header>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginTop: '2rem' }}>Loading...</p>
      </div>
    );
  }

  if (data.locked) {
    return (
      <div className="totals">
        <header className="totals-header">
          <Link href="/" className="btn-ghost btn-sm">← Back</Link>
          <h1 className="totals-title">Aggregate Rankings</h1>
        </header>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px' }}>
          <p style={{ fontSize: '32px' }}>🔒</p>
          <p style={{ fontWeight: 700, fontSize: '18px' }}>Results not yet revealed</p>
          <p style={{ color: 'var(--text-dim)', fontSize: '14px' }}>Keep rating — results will appear here when ready.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {data.reveal && !revealSeen && (
        <RevealOverlay
          restaurants={data.restaurants}
          users={data.users}
          mostControversial={data.mostControversial}
          crowdPleaser={data.crowdPleaser}
          contrarian={data.contrarian}
          generousRater={data.generousRater}
          harshCritic={data.harshCritic}
          mostDedicated={data.mostDedicated}
          leastDedicated={data.leastDedicated}
          onDismiss={() => {
            if (data.revealStarted) {
              localStorage.setItem(`tendies_reveal_seen_${data.revealStarted}`, '1');
            }
            setRevealSeenTick((t) => t + 1);
          }}
        />
      )}
      <div className="totals">
        <header className="totals-header">
          <Link href="/" className="btn-ghost btn-sm">← Back</Link>
          <h1 className="totals-title">Aggregate Rankings</h1>
        </header>

        <section className="totals-section">
          <h2 className="section-heading">Restaurants</h2>
          <ul className="totals-list">
            {data.restaurants.map((r) => (
              <li key={r.name} className="totals-row">
                <span className="totals-name">{r.name}</span>
                <span
                  className="totals-avg"
                  style={r.average !== null ? { color: scoreToColor(r.average) } : undefined}
                >
                  {r.average !== null ? r.average.toFixed(1) : '—'}
                </span>
                <span className="totals-count">
                  {r.count > 0 ? `${r.count} user${r.count !== 1 ? 's' : ''}` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="totals-section">
          <h2 className="section-heading">Users</h2>
          <ul className="totals-list">
            {data.users.map((u) => (
              <li key={u.username} className="totals-row">
                <span className="totals-name">{u.username}</span>
                <span className="totals-count">{u.ratingCount}/{data.total} rated</span>
                <span className="totals-avg">
                  {u.matchScore !== null ? `${u.matchScore}%` : '—'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
