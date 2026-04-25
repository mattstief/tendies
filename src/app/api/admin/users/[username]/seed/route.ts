import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { getRestaurants } from '@/lib/restaurants';

export async function POST(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  const restaurants = await getRestaurants(redis);

  const ratings: Record<string, string> = {};
  for (const r of restaurants) {
    ratings[r] = String(Math.floor(Math.random() * 10) + 1);
  }

  await Promise.all([
    redis.sadd('users', username),
    redis.hset(`ratings:${username}`, ratings),
    redis.set(`joined:${username}`, Date.now(), { nx: true }),
  ]);

  return NextResponse.json({ ok: true });
}
