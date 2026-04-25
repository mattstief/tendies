import { POST } from '@/app/api/register/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/redis', () => ({
  __esModule: true,
  default: { sadd: jest.fn().mockResolvedValue(1) },
}));

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/register', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/register', () => {
  it('returns 400 when username is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when username is empty string', async () => {
    const res = await POST(makeRequest({ username: '  ' }));
    expect(res.status).toBe(400);
  });

  it('adds trimmed username to Redis users SET', async () => {
    const redis = require('@/lib/redis').default;
    await POST(makeRequest({ username: '  alice  ' }));
    expect(redis.sadd).toHaveBeenCalledWith('users', 'alice');
  });

  it('sets tendies_username cookie on success', async () => {
    const res = await POST(makeRequest({ username: 'alice' }));
    expect(res.status).toBe(200);
    expect(res.cookies.get('tendies_username')?.value).toBe('alice');
  });
});
