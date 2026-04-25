import { GET } from '@/app/api/totals/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/redis', () => ({
  __esModule: true,
  default: {
    smembers: jest.fn(),
    hgetall: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRedis = require('@/lib/redis').default as {
  smembers: jest.Mock;
  hgetall: jest.Mock;
};

function makeGet(cookie?: string) {
  return new NextRequest('http://localhost/api/totals', {
    headers: cookie ? { cookie } : {},
  });
}

describe('GET /api/totals', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when no cookie', async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it('returns aggregate averages and user breakdown', async () => {
    mockRedis.smembers.mockResolvedValue(['alice', 'bob']);
    // alice rated Popeyes 10, bob rated Popeyes 8 → avg 9
    mockRedis.hgetall
      .mockResolvedValueOnce({ 'Popeyes': '10' }) // alice ratings
      .mockResolvedValueOnce({ 'Popeyes': '8' });  // bob ratings

    const res = await GET(makeGet('tendies_username=alice'));
    const data = await res.json();

    const popeyes = data.restaurants.find((r: { name: string }) => r.name === 'Popeyes');
    expect(popeyes.average).toBe(9.0);
    expect(popeyes.count).toBe(2);

    expect(data.users).toHaveLength(2);
    expect(data.total).toBe(10);
  });

  it('places unrated restaurants (null average) after rated ones', async () => {
    mockRedis.smembers.mockResolvedValue(['alice']);
    mockRedis.hgetall.mockResolvedValueOnce({ 'Popeyes': '9' });

    const res = await GET(makeGet('tendies_username=alice'));
    const data = await res.json();

    const rated = data.restaurants.filter((r: { average: number | null }) => r.average !== null);
    const unrated = data.restaurants.filter((r: { average: number | null }) => r.average === null);
    expect(rated[0].name).toBe('Popeyes');
    expect(unrated.length).toBe(9);
  });

  it('sorts users by match score descending, nulls last', async () => {
    mockRedis.smembers.mockResolvedValue(['alice', 'bob']);
    // alice: perfect match; bob: no ratings (null match score)
    mockRedis.hgetall
      .mockResolvedValueOnce({ 'Popeyes': '9' }) // alice
      .mockResolvedValueOnce({});                  // bob

    const res = await GET(makeGet('tendies_username=alice'));
    const data = await res.json();

    expect(data.users[0].username).toBe('alice');
    expect(data.users[1].username).toBe('bob');
    expect(data.users[1].matchScore).toBeNull();
  });
});
