import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { getRestaurants } from '@/lib/restaurants';

export async function GET() {
  const [restaurants, revealActive] = await Promise.all([
    getRestaurants(redis),
    redis.get('reveal:active'),
  ]);
  return NextResponse.json({ restaurants, reveal: !!revealActive });
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) {
    return NextResponse.json({ error: 'Name required' }, { status: 400 });
  }

  const existing = await getRestaurants(redis);
  if (existing.map((r) => r.toLowerCase()).includes(trimmed.toLowerCase())) {
    return NextResponse.json({ error: 'Already exists' }, { status: 409 });
  }

  await redis.rpush('restaurants', trimmed);
  return NextResponse.json({ ok: true });
}
