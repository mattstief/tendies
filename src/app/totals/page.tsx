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
}

function revealKey(started: string) {
  return `tendies_reveal_seen_${started}`;
}

export default function TotalsPage() {
  const router = useRouter();
  const [data, setData] = useState<TotalsData | null>(null);
  const [revealDismissed, setRevealDismissed] = useState(false);

  useEffect(() => {
    async function fetchTotals() {
      const res = await fetch('/api/totals');
      if (res.status === 401) {
        router.replace('/');
        return;
      }
      if (res.ok) {
        const json: TotalsData = await res.json();
        setData(json);
        if (json.revealStarted && localStorage.getItem(revealKey(json.revealStarted)) === '1') {
          setRevealDismissed(true);
        }
      }
    }

    fetchTotals();
    const id = setInterval(fetchTotals, 2000);
    return () => clearInterval(id);
  }, [router]);

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
      {data.reveal && !revealDismissed && (
        <RevealOverlay
          restaurants={data.restaurants}
          users={data.users}
          onDismiss={() => {
            if (data.revealStarted) {
              localStorage.setItem(revealKey(data.revealStarted), '1');
            }
            setRevealDismissed(true);
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
