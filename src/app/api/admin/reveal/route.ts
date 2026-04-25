import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST() {
  await Promise.all([
    redis.set('reveal:active', '1'),
    redis.set('reveal:started', Date.now().toString()),
  ]);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await Promise.all([
    redis.del('reveal:active'),
    redis.del('reveal:started'),
  ]);
  return NextResponse.json({ ok: true });
}
