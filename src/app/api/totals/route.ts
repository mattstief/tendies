import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { RESTAURANTS } from '@/lib/restaurants';
import { calcMatchScore } from '@/lib/scoring';

export async function GET(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const users = await redis.smembers('users');

  const allRatings: Record<string, Record<string, number>> = {};
  await Promise.all(
    users.map(async (user) => {
      const raw = await redis.hgetall(`ratings:${user}`);
      const ratings: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw ?? {})) {
        ratings[k] = parseInt(String(v), 10);
      }
      allRatings[user] = ratings;
    })
  );

  const totals: Record<string, { sum: number; count: number }> = {};
  for (const r of RESTAURANTS) totals[r] = { sum: 0, count: 0 };

  for (const ratings of Object.values(allRatings)) {
    for (const [restaurant, score] of Object.entries(ratings)) {
      if (totals[restaurant]) {
        totals[restaurant].sum += score;
        totals[restaurant].count++;
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
    .sort((a, b) => b.ratingCount - a.ratingCount);

  return NextResponse.json({ restaurants, users: userBreakdown, total: RESTAURANTS.length });
}
