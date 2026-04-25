'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RESTAURANTS } from '@/lib/restaurants';

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
  restaurants: RestaurantRow[];
  users: UserRow[];
  total: number;
}

export default function TotalsPage() {
  const router = useRouter();
  const [data, setData] = useState<TotalsData | null>(null);

  useEffect(() => {
    async function fetchTotals() {
      const res = await fetch('/api/totals');
      if (res.status === 401) {
        router.replace('/');
        return;
      }
      if (res.ok) {
        setData(await res.json());
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
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Loading...</p>
      </div>
    );
  }

  return (
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
              <span className="totals-avg">
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
              <span className="totals-count">{u.ratingCount}/{RESTAURANTS.length} rated</span>
              <span className="totals-avg">
                {u.matchScore !== null ? `${u.matchScore}%` : '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
