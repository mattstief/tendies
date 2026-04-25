import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const body = await req.json();
  const { a, b, winner } = body;

  if (!a || !b || !winner) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (winner !== a && winner !== b && winner !== 'tie') {
    return NextResponse.json({ error: 'Invalid winner' }, { status: 400 });
  }

  const key = [a, b].sort().join('||');
  await redis.hset(`preferences:${username}`, { [key]: winner });
  return NextResponse.json({ ok: true });
}
