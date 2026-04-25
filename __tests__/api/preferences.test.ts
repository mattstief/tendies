import { POST } from '@/app/api/preferences/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/redis', () => ({
  __esModule: true,
  default: { hset: jest.fn().mockResolvedValue(1) },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRedis = require('@/lib/redis').default as { hset: jest.Mock };

function makePost(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/preferences', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
  });
}

describe('POST /api/preferences', () => {
  it('returns 401 when no cookie', async () => {
    const res = await POST(makePost({ a: 'Popeyes', b: "Cane's", winner: 'Popeyes' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when winner is not a, b, or "tie"', async () => {
    const res = await POST(
      makePost({ a: 'Popeyes', b: "Cane's", winner: 'Wendy\'s' }, 'tendies_username=alice')
    );
    expect(res.status).toBe(400);
  });

  it('stores preference with alphabetically sorted key', async () => {
    await POST(
      makePost({ a: 'Popeyes', b: "Cane's", winner: 'Popeyes' }, 'tendies_username=alice')
    );
    // "Cane's" sorts before "Popeyes" alphabetically
    expect(mockRedis.hset).toHaveBeenCalledWith(
      'preferences:alice',
      "Cane's||Popeyes",
      'Popeyes'
    );
  });

  it('stores "tie" as winner when user keeps the tie', async () => {
    await POST(
      makePost({ a: "Cane's", b: 'Popeyes', winner: 'tie' }, 'tendies_username=alice')
    );
    expect(mockRedis.hset).toHaveBeenCalledWith(
      'preferences:alice',
      "Cane's||Popeyes",
      'tie'
    );
  });
});
