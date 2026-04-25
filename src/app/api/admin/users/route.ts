import { NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { getRestaurants } from '@/lib/restaurants';

export async function GET() {
  const [users, restaurantList] = await Promise.all([
    redis.smembers('users'),
    getRestaurants(redis),
  ]);

  const userData = await Promise.all(
    users.map(async (username) => {
      const raw = await redis.hgetall(`ratings:${username}`);
      return { username, ratingCount: Object.keys(raw ?? {}).length };
    })
  );

  userData.sort((a, b) => b.ratingCount - a.ratingCount);

  return NextResponse.json({ users: userData, total: restaurantList.length });
}
