import redis from './redis';
import { getRestaurants } from './restaurants';
import { calcMatchScore } from './scoring';

export async function recomputeAllMatchScores(): Promise<void> {
  const [users, restaurantList] = await Promise.all([
    redis.smembers('users'),
    getRestaurants(redis),
  ]);

  if (users.length === 0) return;

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
    for (const [r, score] of Object.entries(ratings)) {
      if (totals[r]) { totals[r].sum += score; totals[r].count++; }
    }
  }

  const aggregateAverages: Record<string, number> = {};
  for (const r of restaurantList) {
    const { sum, count } = totals[r];
    if (count > 0) aggregateAverages[r] = Math.round((sum / count) * 10) / 10;
  }

  await Promise.all(
    users.map((user) => {
      const score = calcMatchScore(allRatings[user], aggregateAverages);
      return score !== null
        ? redis.set(`matchscore:${user}`, score.toString())
        : redis.del(`matchscore:${user}`);
    })
  );
}
