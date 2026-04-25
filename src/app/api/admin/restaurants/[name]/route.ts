import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { name: string } }
) {
  await redis.lrem('restaurants', 0, params.name);
  return NextResponse.json({ ok: true });
}
