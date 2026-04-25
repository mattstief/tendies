import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import redis from '@/lib/redis';
import { RESTAURANTS } from '@/lib/restaurants';
import { calcMatchScore } from '@/lib/scoring';
import Link from 'next/link';

export default async function TotalsPage() {
  const cookieStore = cookies();
  const username = cookieStore.get('tendies_username')?.value;
  if (!username) redirect('/');

  const users = await redis.smembers('users');

  const allRatings: Record<string, Record<string, number>> = {};
  await Promise.all(
    users.map(async (user) => {
      const raw = await redis.hgetall(`ratings:${user}`);
      const ratings: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw ?? {})) {
        ratings[k] = parseInt(v, 10);
      }
      allRatings[user] = ratings;
    })
  );

  const totals: Record<string, { sum: number; count: number }> = {};
  for (const r of RESTAURANTS) totals[r] = { sum: 0, count: 0 };
  for (const ratings of Object.values(allRatings)) {
    for (const [r, score] of Object.entries(ratings)) {
      if (totals[r]) {
        totals[r].sum += score;
        totals[r].count++;
      }
    }
  }

  const aggregateAverages: Record<string, number> = {};
  const restaurants = [...RESTAURANTS]
    .map((r) => {
      const { sum, count } = totals[r];
      const average = count > 0 ? Math.round((sum / count) * 10) / 10 : null;
      if (average !== null) aggregateAverages[r] = average;
      return { name: r, average, count };
    })
    .sort((a, b) => {
      if (a.average === null && b.average === null) return 0;
      if (a.average === null) return 1;
      if (b.average === null) return -1;
      return b.average - a.average;
    });

  const userBreakdown = users
    .map((user) => ({
      username: user,
      ratingCount: Object.keys(allRatings[user]).length,
      matchScore: calcMatchScore(allRatings[user], aggregateAverages),
    }))
    .sort((a, b) => {
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return b.matchScore - a.matchScore;
    });

  return (
    <div className="totals">
      <header className="totals-header">
        <Link href="/" className="btn-ghost btn-sm">← Back</Link>
        <h1 className="totals-title">Aggregate Rankings</h1>
      </header>

      <section className="totals-section">
        <h2 className="section-heading">Restaurants</h2>
        <ul className="totals-list">
          {restaurants.map((r) => (
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
          {userBreakdown.map((u) => (
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
