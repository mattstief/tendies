import { NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function DELETE() {
  const users = await redis.smembers('users');
  await Promise.all(
    users.flatMap((u) => [
      redis.del(`ratings:${u}`),
      redis.del(`preferences:${u}`),
    ])
  );
  return NextResponse.json({ ok: true });
}
