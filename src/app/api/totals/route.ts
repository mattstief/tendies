import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { getRestaurants } from '@/lib/restaurants';
import { calcMatchScore } from '@/lib/scoring';

export async function GET(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const [users, restaurantList, revealActive, revealStarted] = await Promise.all([
    redis.smembers('users'),
    getRestaurants(redis),
    redis.get('reveal:active'),
    redis.get('reveal:started'),
  ]);

  if (!revealActive) {
    return NextResponse.json({ locked: true });
  }

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
  for (const r of restaurantList) totals[r] = { sum: 0, count: 0 };

  for (const ratings of Object.values(allRatings)) {
    for (const [restaurant, score] of Object.entries(ratings)) {
      if (totals[restaurant]) {
        totals[restaurant].sum += score;
        totals[restaurant].count++;
      }
    }
  }

  const aggregateAverages: Record<string, number> = {};
  const restaurants = restaurantList
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

  const joinTimes = await Promise.all(
    users.map((user) => redis.get(`joined:${user}`))
  );
  const joinedAt: Record<string, number> = {};
  users.forEach((user, i) => {
    joinedAt[user] = Number(joinTimes[i] ?? 0);
  });

  const userBreakdown = users
    .map((user) => ({
      username: user,
      ratingCount: Object.keys(allRatings[user]).length,
      matchScore: calcMatchScore(allRatings[user], aggregateAverages),
    }))
    .sort((a, b) => {
      if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return joinedAt[a.username] - joinedAt[b.username];
    });

  // Std dev per restaurant (requires ≥2 raters)
  const restaurantScores: Record<string, number[]> = {};
  for (const r of restaurantList) restaurantScores[r] = [];
  for (const ratings of Object.values(allRatings)) {
    for (const [restaurant, score] of Object.entries(ratings)) {
      if (restaurantScores[restaurant]) restaurantScores[restaurant].push(score);
    }
  }

  const statsEligible = restaurantList
    .map((r) => {
      const scores = restaurantScores[r];
      if (scores.length < 2) return null;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / scores.length);
      return { name: r, stdDev: Math.round(stdDev * 10) / 10 };
    })
    .filter((r): r is { name: string; stdDev: number } => r !== null);

  const mostControversial = statsEligible.length > 0
    ? statsEligible.reduce((a, b) => b.stdDev > a.stdDev ? b : a)
    : null;
  const crowdPleaser = statsEligible.length > 0
    ? statsEligible.reduce((a, b) => b.stdDev < a.stdDev ? b : a)
    : null;

  const usersWithScore = userBreakdown.filter((u) => u.matchScore !== null);
  const contrarian = usersWithScore.length > 1
    ? usersWithScore.reduce((a, b) => (b.matchScore! < a.matchScore! ? b : a))
    : null;

  // Personal average ratings (require ≥3 rated to be meaningful)
  const personalAvgs = userBreakdown
    .filter((u) => u.ratingCount >= 3)
    .map((u) => {
      const scores = Object.values(allRatings[u.username]);
      const avg = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      return { username: u.username, avg };
    });

  const generousRater = personalAvgs.length > 1
    ? personalAvgs.reduce((a, b) => b.avg > a.avg ? b : a)
    : null;
  const harshCritic = personalAvgs.length > 1
    ? personalAvgs.reduce((a, b) => b.avg < a.avg ? b : a)
    : null;

  return NextResponse.json({
    restaurants,
    users: userBreakdown,
    total: restaurantList.length,
    reveal: !!revealActive,
    revealStarted: revealStarted ?? null,
    mostControversial,
    crowdPleaser,
    contrarian: contrarian ? { username: contrarian.username, matchScore: contrarian.matchScore as number } : null,
    generousRater,
    harshCritic,
  });
}
