import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST() {
  await redis.set('reveal:active', '1');
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await redis.del('reveal:active');
  return NextResponse.json({ ok: true });
}
