import { GET, POST } from '@/app/api/ratings/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/redis', () => ({
  __esModule: true,
  default: {
    hgetall: jest.fn(),
    hset: jest.fn().mockResolvedValue(1),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRedis = require('@/lib/redis').default as {
  hgetall: jest.Mock;
  hset: jest.Mock;
};

function makeGet(cookie?: string) {
  return new NextRequest('http://localhost/api/ratings', {
    headers: cookie ? { cookie } : {},
  });
}

function makePost(body: unknown, cookie?: string) {
  return new NextRequest('http://localhost/api/ratings', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { cookie } : {}),
    },
  });
}

describe('GET /api/ratings', () => {
  it('returns 401 when no cookie', async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it('returns ratings as numbers and preferences as strings', async () => {
    mockRedis.hgetall
      .mockResolvedValueOnce({ 'Popeyes': '9', "Cane's": '8' })
      .mockResolvedValueOnce({ "Cane's||Popeyes": 'Popeyes' });

    const res = await GET(makeGet('tendies_username=alice'));
    const data = await res.json();

    expect(data.ratings).toEqual({ 'Popeyes': 9, "Cane's": 8 });
    expect(data.preferences).toEqual({ "Cane's||Popeyes": 'Popeyes' });
  });

  it('handles null Redis responses gracefully', async () => {
    mockRedis.hgetall.mockResolvedValue(null);
    const res = await GET(makeGet('tendies_username=newuser'));
    const data = await res.json();
    expect(data.ratings).toEqual({});
    expect(data.preferences).toEqual({});
  });
});

describe('POST /api/ratings', () => {
  it('returns 401 when no cookie', async () => {
    const res = await POST(makePost({ restaurant: 'Popeyes', score: 8 }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for non-integer score', async () => {
    const res = await POST(makePost({ restaurant: 'Popeyes', score: 7.5 }, 'tendies_username=alice'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for out-of-range score', async () => {
    const res = await POST(makePost({ restaurant: 'Popeyes', score: 11 }, 'tendies_username=alice'));
    expect(res.status).toBe(400);
  });

  it('saves rating to Redis hset', async () => {
    const res = await POST(makePost({ restaurant: 'Popeyes', score: 9 }, 'tendies_username=alice'));
    expect(res.status).toBe(200);
    expect(mockRedis.hset).toHaveBeenCalledWith('ratings:alice', 'Popeyes', '9');
  });
});
