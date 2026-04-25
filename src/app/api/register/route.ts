import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }
  await redis.sadd('users', username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('tendies_username', username, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    httpOnly: false,
  });
  return res;
}
