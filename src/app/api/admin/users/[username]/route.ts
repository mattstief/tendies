import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  const { username } = params;
  await Promise.all([
    redis.srem('users', username),
    redis.del(`ratings:${username}`),
    redis.del(`preferences:${username}`),
    redis.del(`joined:${username}`),
  ]);
  return NextResponse.json({ ok: true });
}
