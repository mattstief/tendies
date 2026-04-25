import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  await Promise.all([
    redis.del(`ratings:${params.username}`),
    redis.del(`preferences:${params.username}`),
  ]);
  return NextResponse.json({ ok: true });
}
