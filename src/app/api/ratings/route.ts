import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const [rawRatings, rawPreferences] = await Promise.all([
    redis.hgetall(`ratings:${username}`),
    redis.hgetall(`preferences:${username}`),
  ]);

  const ratings: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawRatings ?? {})) {
    ratings[k] = parseInt(v, 10);
  }

  return NextResponse.json({ ratings, preferences: rawPreferences ?? {} });
}

export async function POST(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const body = await req.json();
  const { restaurant, score } = body;

  if (
    !restaurant ||
    typeof score !== 'number' ||
    !Number.isInteger(score) ||
    score < 1 ||
    score > 10
  ) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  await redis.hset(`ratings:${username}`, restaurant, score.toString());
  return NextResponse.json({ ok: true });
}
