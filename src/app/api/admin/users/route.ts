import { NextRequest, NextResponse } from 'next/server';
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

export async function POST(req: NextRequest) {
  const { username } = await req.json();
  const trimmed = typeof username === 'string' ? username.trim() : '';
  if (!trimmed) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }

  const existing = await redis.smembers('users');
  if (existing.includes(trimmed)) {
    return NextResponse.json({ error: 'Already exists' }, { status: 409 });
  }

  await Promise.all([
    redis.sadd('users', trimmed),
    redis.set(`joined:${trimmed}`, Date.now(), { nx: true }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const users = await redis.smembers('users');
  await Promise.all([
    redis.del('users'),
    ...users.flatMap((u) => [
      redis.del(`ratings:${u}`),
      redis.del(`preferences:${u}`),
      redis.del(`joined:${u}`),
    ]),
  ]);
  return NextResponse.json({ ok: true });
}
