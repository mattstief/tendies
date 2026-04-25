# Tendies Rating App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-friendly Next.js web app where users rate chicken tender restaurants 1–10, resolve ties via head-to-head matchups, and view aggregate scores at `/totals`.

**Architecture:** Next.js App Router with server components handling auth/data fetching and client components managing interactive UI (rating sheet, tiebreaker sheet, list). API routes handle mutations. Redis stores all data via `ioredis`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, React, ioredis, Jest + ts-jest

---

## Prerequisites

Redis must be running locally on port 6379 before starting the dev server or tests.
```bash
redis-server
# or via homebrew: brew services start redis
```

---

## File Map

```
tendies/
├── .env.local                                   # REDIS_URL=redis://localhost:6379
├── jest.config.ts                               # Jest config with ts-jest and path alias
├── src/
│   ├── app/
│   │   ├── globals.css                          # Mobile-first base styles + CSS vars
│   │   ├── layout.tsx                           # Root layout: viewport meta, font
│   │   ├── page.tsx                             # Server: cookie check → UsernameEntry or HomeClient
│   │   ├── totals/
│   │   │   └── page.tsx                         # Server: read Redis directly, render totals
│   │   └── api/
│   │       ├── register/route.ts                # POST: add user to SET, set cookie
│   │       ├── ratings/route.ts                 # GET: fetch ratings+prefs; POST: save rating
│   │       ├── preferences/route.ts             # POST: save tiebreaker preference
│   │       └── totals/route.ts                  # GET: aggregate scores + user breakdown
│   ├── lib/
│   │   ├── redis.ts                             # ioredis singleton
│   │   ├── restaurants.ts                       # RESTAURANTS constant (10 items)
│   │   └── scoring.ts                           # sortRestaurants, getNewTiePairs, calcMatchScore
│   └── components/
│       ├── UsernameEntry.tsx                    # Client: username form → POST /api/register
│       ├── HomeClient.tsx                       # Client: owns ratings state, orchestrates sheets
│       ├── RestaurantList.tsx                   # Client: sorted list of restaurant buttons
│       ├── SwipeCard.tsx                        # Client: touch swipe to change score
│       ├── RatingSheet.tsx                      # Client: bottom sheet wrapping SwipeCard
│       └── TiebreakerSheet.tsx                  # Client: pairwise matchup sequence
└── __tests__/
    ├── lib/scoring.test.ts                      # Unit tests for all scoring functions
    └── api/
        ├── register.test.ts
        ├── ratings.test.ts
        ├── preferences.test.ts
        └── totals.test.ts
```

---

## Task 1: Scaffold Next.js Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `jest.config.ts`, `.env.local`

- [ ] **Step 1: Bootstrap the project**

```bash
cd /Users/mstieferman/tendies
npx create-next-app@14 . --typescript --app --src-dir --no-tailwind --eslint --import-alias "@/*"
```

When prompted: use default options. Answer `No` to Turbopack if asked.

- [ ] **Step 2: Install dependencies**

```bash
npm install ioredis
npm install --save-dev jest ts-jest @types/jest
```

- [ ] **Step 3: Create `.env.local`**

```
REDIS_URL=redis://localhost:6379
```

- [ ] **Step 4: Create `jest.config.ts`**

```typescript
import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

export default config;
```

- [ ] **Step 5: Add test script to `package.json`**

In `package.json`, ensure `scripts` contains:
```json
"test": "jest",
"test:watch": "jest --watch"
```

- [ ] **Step 6: Remove boilerplate**

Delete `src/app/page.module.css`. Replace the contents of `src/app/page.tsx` with:

```tsx
export default function Page() {
  return <div>scaffold</div>;
}
```

Replace `src/app/globals.css` with:

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: server starts at http://localhost:3000 with no errors.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js project with ioredis and jest"
```

---

## Task 2: Constants and Redis Client

**Files:**
- Create: `src/lib/restaurants.ts`
- Create: `src/lib/redis.ts`

- [ ] **Step 1: Create `src/lib/restaurants.ts`**

```typescript
export const RESTAURANTS = [
  "McDonald's",
  "Church's Chicken",
  "Popeyes",
  "Wendy's",
  "HEB",
  "Chick-fil-A",
  "Sonic",
  "Dairy Queen",
  "Cane's",
  "Whataburger",
] as const;

export type Restaurant = (typeof RESTAURANTS)[number];
```

- [ ] **Step 2: Create `src/lib/redis.ts`**

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

export default redis;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/restaurants.ts src/lib/redis.ts
git commit -m "feat: add restaurant list constant and Redis client"
```

---

## Task 3: Scoring Logic (TDD)

**Files:**
- Create: `__tests__/lib/scoring.test.ts`
- Create: `src/lib/scoring.ts`

The scoring module has three pure functions:
- `sortRestaurants` — sort a user's restaurant list by rating desc, with tie-break ordering within same-score groups
- `getNewTiePairs` — given a new rating, return pairs that need a tie-breaker prompt (only new pairings without existing preferences)
- `calcMatchScore` — percentage match between a user's ratings and the aggregate averages

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/scoring.test.ts`:

```typescript
import { sortRestaurants, getNewTiePairs, calcMatchScore } from '@/lib/scoring';

describe('sortRestaurants', () => {
  const all = ["McDonald's", 'Popeyes', "Cane's", 'Wendy\'s'];

  it('puts unrated restaurants after rated ones', () => {
    const ratings = { "Popeyes": 9 };
    const result = sortRestaurants(all, ratings, {});
    expect(result[0]).toBe('Popeyes');
    expect(result.slice(1)).toEqual(expect.arrayContaining(["McDonald's", "Cane's", "Wendy's"]));
  });

  it('sorts rated restaurants descending by score', () => {
    const ratings = { "McDonald's": 6, "Popeyes": 9, "Cane's": 8 };
    const result = sortRestaurants(all, ratings, {});
    expect(result.slice(0, 3)).toEqual(['Popeyes', "Cane's", "McDonald's"]);
  });

  it('orders tied restaurants by win count from preferences', () => {
    const ratings = { "Popeyes": 8, "Cane's": 8 };
    const preferences = { "Cane's||Popeyes": "Cane's" };
    const result = sortRestaurants(all, ratings, preferences);
    expect(result[0]).toBe("Cane's");
    expect(result[1]).toBe('Popeyes');
  });

  it('keeps tied restaurants stable when no preferences exist', () => {
    const ratings = { "Popeyes": 8, "Cane's": 8 };
    const result = sortRestaurants(all, ratings, {});
    // Both appear, order is stable — just verify both are in top 2
    expect(result.slice(0, 2)).toEqual(expect.arrayContaining(['Popeyes', "Cane's"]));
  });

  it('handles 3-way tie: most wins first', () => {
    // Popeyes beats Cane's and McDonald's; Cane's beats McDonald's
    const ratings = { "McDonald's": 7, "Popeyes": 7, "Cane's": 7 };
    const preferences = {
      "McDonald's||Popeyes": 'Popeyes',
      "Cane's||Popeyes": 'Popeyes',
      "Cane's||McDonald's": "Cane's",
    };
    const result = sortRestaurants(all, ratings, preferences);
    expect(result[0]).toBe('Popeyes');
    expect(result[1]).toBe("Cane's");
    expect(result[2]).toBe("McDonald's");
  });

  it('win count only considers restaurants in the same score group', () => {
    // Popeyes rated 9, Cane's rated 8; preference between them should not affect ordering
    const ratings = { "Popeyes": 9, "Cane's": 8 };
    const preferences = { "Cane's||Popeyes": "Cane's" };
    const result = sortRestaurants(all, ratings, preferences);
    // Popeyes should still come first (higher raw score wins)
    expect(result[0]).toBe('Popeyes');
    expect(result[1]).toBe("Cane's");
  });
});

describe('getNewTiePairs', () => {
  it('returns empty array when no existing ratings match the new score', () => {
    const existing = { "Popeyes": 9 };
    const result = getNewTiePairs("Cane's", 8, existing, {});
    expect(result).toEqual([]);
  });

  it('returns a pair when a match exists with no stored preference', () => {
    const existing = { "Popeyes": 8 };
    const result = getNewTiePairs("Cane's", 8, existing, {});
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.arrayContaining(["Cane's", 'Popeyes']));
  });

  it('excludes pairs that already have a stored preference', () => {
    const existing = { "Popeyes": 8 };
    const preferences = { "Cane's||Popeyes": 'Popeyes' };
    const result = getNewTiePairs("Cane's", 8, existing, preferences);
    expect(result).toEqual([]);
  });

  it('does not include the new restaurant as a match against itself', () => {
    const existing = { "Cane's": 8 };
    const result = getNewTiePairs("Cane's", 8, existing, {});
    expect(result).toEqual([]);
  });

  it('returns multiple pairs when multiple restaurants share the new score', () => {
    const existing = { "Popeyes": 8, "McDonald's": 8, "Wendy's": 9 };
    const result = getNewTiePairs("Cane's", 8, existing, {});
    expect(result).toHaveLength(2);
  });
});

describe('calcMatchScore', () => {
  it('returns null when user has no ratings', () => {
    expect(calcMatchScore({}, { "Popeyes": 8 })).toBeNull();
  });

  it('returns null when user ratings have no overlap with aggregate', () => {
    expect(calcMatchScore({ "Popeyes": 8 }, { "Cane's": 7 })).toBeNull();
  });

  it('returns 100 when user ratings exactly match aggregate', () => {
    const ratings = { "Popeyes": 8, "Cane's": 7 };
    const aggregate = { "Popeyes": 8, "Cane's": 7 };
    expect(calcMatchScore(ratings, aggregate)).toBe(100);
  });

  it('returns 0 when all deviations are maximal (9 points off)', () => {
    const ratings = { "Popeyes": 1 };
    const aggregate = { "Popeyes": 10 };
    expect(calcMatchScore(ratings, aggregate)).toBe(0);
  });

  it('only uses restaurants present in both user ratings and aggregate', () => {
    // "Cane's" is not in aggregate — should not affect score
    const ratings = { "Popeyes": 8, "Cane's": 1 };
    const aggregate = { "Popeyes": 8 };
    expect(calcMatchScore(ratings, aggregate)).toBe(100);
  });

  it('calculates partial match correctly', () => {
    // Deviation of 4.5 out of 9 = 50% deviation → 50% match
    const ratings = { "Popeyes": 1 };
    const aggregate = { "Popeyes": 5.5 };
    expect(calcMatchScore(ratings, aggregate)).toBe(50);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/scoring.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/scoring'`

- [ ] **Step 3: Implement `src/lib/scoring.ts`**

```typescript
export type Ratings = Record<string, number>;
export type Preferences = Record<string, string>;

export function sortRestaurants(
  restaurants: readonly string[],
  ratings: Ratings,
  preferences: Preferences
): string[] {
  const rated = restaurants.filter((r) => ratings[r] !== undefined);
  const unrated = restaurants.filter((r) => ratings[r] === undefined);

  const byScore: Record<number, string[]> = {};
  for (const r of rated) {
    const score = ratings[r];
    if (!byScore[score]) byScore[score] = [];
    byScore[score].push(r);
  }

  const sortedRated: string[] = [];
  const scores = Object.keys(byScore)
    .map(Number)
    .sort((a, b) => b - a);

  for (const score of scores) {
    const group = byScore[score];
    if (group.length === 1) {
      sortedRated.push(group[0]);
    } else {
      sortedRated.push(...sortGroupByPreferences(group, preferences));
    }
  }

  return [...sortedRated, ...unrated];
}

function sortGroupByPreferences(group: string[], preferences: Preferences): string[] {
  const wins: Record<string, number> = {};
  for (const r of group) wins[r] = 0;

  for (let i = 0; i < group.length; i++) {
    for (let j = i + 1; j < group.length; j++) {
      const key = [group[i], group[j]].sort().join('||');
      const winner = preferences[key];
      if (winner && wins[winner] !== undefined) {
        wins[winner]++;
      }
    }
  }

  return [...group].sort((a, b) => wins[b] - wins[a]);
}

export function getNewTiePairs(
  newRestaurant: string,
  newScore: number,
  existingRatings: Ratings,
  existingPreferences: Preferences
): [string, string][] {
  const pairs: [string, string][] = [];
  for (const [restaurant, score] of Object.entries(existingRatings)) {
    if (restaurant === newRestaurant) continue;
    if (score !== newScore) continue;
    const key = [newRestaurant, restaurant].sort().join('||');
    if (!existingPreferences[key]) {
      pairs.push([newRestaurant, restaurant]);
    }
  }
  return pairs;
}

export function calcMatchScore(
  userRatings: Ratings,
  aggregateAverages: Record<string, number>
): number | null {
  const common = Object.keys(userRatings).filter(
    (r) => aggregateAverages[r] !== undefined
  );
  if (common.length === 0) return null;

  const totalDeviation = common.reduce((sum, r) => {
    return sum + Math.abs(userRatings[r] - aggregateAverages[r]) / 9;
  }, 0);

  return Math.round(100 * (1 - totalDeviation / common.length));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/scoring.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.ts __tests__/lib/scoring.test.ts
git commit -m "feat: add scoring logic with tests (sort, tie pairs, match score)"
```

---

## Task 4: API — Register

**Files:**
- Create: `src/app/api/register/route.ts`
- Create: `__tests__/api/register.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/register.test.ts`:

```typescript
import { POST } from '@/app/api/register/route';
import { NextRequest } from 'next/server';

jest.mock('@/lib/redis', () => ({
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/api/register.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/register/route'`

- [ ] **Step 3: Implement `src/app/api/register/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  if (!username) {
    return NextResponse.json({ error: 'Username required' }, { status: 400 });
  }
  await redis.sadd('users', username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('tendies_username', username, {
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
    httpOnly: false,
  });
  return res;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/api/register.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/register/route.ts __tests__/api/register.test.ts
git commit -m "feat: add POST /api/register with tests"
```

---

## Task 5: API — Ratings (GET + POST)

**Files:**
- Create: `src/app/api/ratings/route.ts`
- Create: `__tests__/api/ratings.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/ratings.test.ts`:

```typescript
import { GET, POST } from '@/app/api/ratings/route';
import { NextRequest } from 'next/server';

const mockRedis = {
  hgetall: jest.fn(),
  hset: jest.fn().mockResolvedValue(1),
};
jest.mock('@/lib/redis', () => ({ default: mockRedis }));

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/api/ratings.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/ratings/route'`

- [ ] **Step 3: Implement `src/app/api/ratings/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function GET(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const [rawRatings, rawPreferences] = await Promise.all([
    redis.hgetall(`ratings:${username}`),
    redis.hgetall(`preferences:${username}`),
  ]);

  const ratings: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawRatings ?? {})) {
    ratings[k] = parseInt(v, 10);
  }

  return NextResponse.json({ ratings, preferences: rawPreferences ?? {} });
}

export async function POST(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const body = await req.json();
  const { restaurant, score } = body;

  if (
    !restaurant ||
    typeof score !== 'number' ||
    !Number.isInteger(score) ||
    score < 1 ||
    score > 10
  ) {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }

  await redis.hset(`ratings:${username}`, restaurant, score.toString());
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/api/ratings.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/ratings/route.ts __tests__/api/ratings.test.ts
git commit -m "feat: add GET+POST /api/ratings with tests"
```

---

## Task 6: API — Preferences

**Files:**
- Create: `src/app/api/preferences/route.ts`
- Create: `__tests__/api/preferences.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/preferences.test.ts`:

```typescript
import { POST } from '@/app/api/preferences/route';
import { NextRequest } from 'next/server';

const mockRedis = { hset: jest.fn().mockResolvedValue(1) };
jest.mock('@/lib/redis', () => ({ default: mockRedis }));

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/api/preferences.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/preferences/route'`

- [ ] **Step 3: Implement `src/app/api/preferences/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';

export async function POST(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const body = await req.json();
  const { a, b, winner } = body;

  if (!a || !b || !winner) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }
  if (winner !== a && winner !== b && winner !== 'tie') {
    return NextResponse.json({ error: 'Invalid winner' }, { status: 400 });
  }

  const key = [a, b].sort().join('||');
  await redis.hset(`preferences:${username}`, key, winner);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/api/preferences.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/preferences/route.ts __tests__/api/preferences.test.ts
git commit -m "feat: add POST /api/preferences with tests"
```

---

## Task 7: API — Totals

**Files:**
- Create: `src/app/api/totals/route.ts`
- Create: `__tests__/api/totals.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/api/totals.test.ts`:

```typescript
import { GET } from '@/app/api/totals/route';
import { NextRequest } from 'next/server';

const mockRedis = { smembers: jest.fn(), hgetall: jest.fn() };
jest.mock('@/lib/redis', () => ({ default: mockRedis }));

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/api/totals.test.ts
```

Expected: FAIL — `Cannot find module '@/app/api/totals/route'`

- [ ] **Step 3: Implement `src/app/api/totals/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import { RESTAURANTS } from '@/lib/restaurants';
import { calcMatchScore } from '@/lib/scoring';

export async function GET(req: NextRequest) {
  const username = req.cookies.get('tendies_username')?.value;
  if (!username) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
  }

  const users = await redis.smembers('users');

  const allRatings: Record<string, Record<string, number>> = {};
  await Promise.all(
    users.map(async (user) => {
      const raw = await redis.hgetall(`ratings:${user}`);
      const ratings: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw ?? {})) {
        ratings[k] = parseInt(v, 10);
      }
      allRatings[user] = ratings;
    })
  );

  const totals: Record<string, { sum: number; count: number }> = {};
  for (const r of RESTAURANTS) totals[r] = { sum: 0, count: 0 };

  for (const ratings of Object.values(allRatings)) {
    for (const [restaurant, score] of Object.entries(ratings)) {
      if (totals[restaurant]) {
        totals[restaurant].sum += score;
        totals[restaurant].count++;
      }
    }
  }

  const aggregateAverages: Record<string, number> = {};
  const restaurants = [...RESTAURANTS]
    .map((r) => {
      const { sum, count } = totals[r];
      const average = count > 0 ? Math.round((sum / count) * 10) / 10 : null;
      if (average !== null) aggregateAverages[r] = average;
      return { name: r, average, count };
    })
    .sort((a, b) => {
      if (a.average === null && b.average === null) return 0;
      if (a.average === null) return 1;
      if (b.average === null) return -1;
      return b.average - a.average;
    });

  const userBreakdown = users
    .map((user) => ({
      username: user,
      ratingCount: Object.keys(allRatings[user]).length,
      matchScore: calcMatchScore(allRatings[user], aggregateAverages),
    }))
    .sort((a, b) => {
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return b.matchScore - a.matchScore;
    });

  return NextResponse.json({ restaurants, users: userBreakdown, total: RESTAURANTS.length });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/api/totals.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npx jest
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/totals/route.ts __tests__/api/totals.test.ts
git commit -m "feat: add GET /api/totals with tests"
```

---

## Task 8: SwipeCard Component

**Files:**
- Create: `src/components/SwipeCard.tsx`

- [ ] **Step 1: Create `src/components/SwipeCard.tsx`**

```tsx
'use client';

import { useRef } from 'react';

interface SwipeCardProps {
  score: number;
  onChange: (score: number) => void;
}

const SWIPE_STEP_PX = 40;

export function SwipeCard({ score, onChange }: SwipeCardProps) {
  const startX = useRef<number | null>(null);
  const startScore = useRef(score);

  function clamp(n: number) {
    return Math.max(1, Math.min(10, n));
  }

  function onTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
    startScore.current = score;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startX.current === null) return;
    const diff = e.touches[0].clientX - startX.current;
    const steps = Math.floor(Math.abs(diff) / SWIPE_STEP_PX);
    const direction = diff > 0 ? 1 : -1;
    const next = clamp(startScore.current + direction * steps);
    if (next !== score) onChange(next);
  }

  function onTouchEnd() {
    startX.current = null;
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ userSelect: 'none', touchAction: 'pan-y' }}
      className="swipe-card"
    >
      <button
        className="swipe-arrow"
        onClick={() => onChange(clamp(score - 1))}
        aria-label="Decrease score"
      >
        ←
      </button>
      <div className="swipe-score">{score}</div>
      <button
        className="swipe-arrow"
        onClick={() => onChange(clamp(score + 1))}
        aria-label="Increase score"
      >
        →
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/SwipeCard.tsx
git commit -m "feat: add SwipeCard component with touch + arrow controls"
```

---

## Task 9: RatingSheet Component

**Files:**
- Create: `src/components/RatingSheet.tsx`

- [ ] **Step 1: Create `src/components/RatingSheet.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { SwipeCard } from './SwipeCard';

interface RatingSheetProps {
  restaurant: string;
  existingScore?: number;
  onSubmit: (score: number) => void;
  onClose: () => void;
}

export function RatingSheet({ restaurant, existingScore, onSubmit, onClose }: RatingSheetProps) {
  const [score, setScore] = useState(existingScore ?? 5);

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <h2 className="sheet-title">{restaurant}</h2>
        <p className="sheet-hint">← swipe to score →</p>
        <SwipeCard score={score} onChange={setScore} />
        <button className="btn-primary" onClick={() => onSubmit(score)}>
          Submit {score}/10
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RatingSheet.tsx
git commit -m "feat: add RatingSheet bottom sheet component"
```

---

## Task 10: TiebreakerSheet Component

**Files:**
- Create: `src/components/TiebreakerSheet.tsx`

- [ ] **Step 1: Create `src/components/TiebreakerSheet.tsx`**

```tsx
'use client';

import { useState } from 'react';

interface Pair {
  a: string;
  b: string;
  score: number;
}

interface TiebreakerSheetProps {
  pairs: Pair[];
  onComplete: (results: Array<{ a: string; b: string; winner: string }>) => void;
}

export function TiebreakerSheet({ pairs, onComplete }: TiebreakerSheetProps) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Array<{ a: string; b: string; winner: string }>>([]);

  const current = pairs[index];

  function pick(winner: string) {
    const next = [...results, { a: current.a, b: current.b, winner }];
    if (index + 1 >= pairs.length) {
      onComplete(next);
    } else {
      setResults(next);
      setIndex(index + 1);
    }
  }

  return (
    <div className="sheet-overlay">
      <div className="sheet">
        <div className="sheet-handle" />
        <p className="sheet-progress">
          Matchup {index + 1} of {pairs.length}
        </p>
        <p className="sheet-hint">Both rated {current.score} — pick your favorite</p>

        <div className="tiebreaker-card" onClick={() => pick(current.a)}>
          <div>
            <div className="card-name">{current.a}</div>
            <div className="card-score">rated {current.score}</div>
          </div>
          <button className="btn-primary btn-sm">Pick this</button>
        </div>

        <div className="tiebreaker-vs">VS</div>

        <div className="tiebreaker-card" onClick={() => pick(current.b)}>
          <div>
            <div className="card-name">{current.b}</div>
            <div className="card-score">rated {current.score}</div>
          </div>
          <button className="btn-primary btn-sm">Pick this</button>
        </div>

        <button className="btn-ghost" onClick={() => pick('tie')}>
          They're equal — keep the tie
        </button>
      </div>
    </div>
  );
}
```

Note: Add `import { useState } from 'react';` at the top of this file.

- [ ] **Step 2: Commit**

```bash
git add src/components/TiebreakerSheet.tsx
git commit -m "feat: add TiebreakerSheet component for pairwise matchups"
```

---

## Task 11: RestaurantList Component

**Files:**
- Create: `src/components/RestaurantList.tsx`

- [ ] **Step 1: Create `src/components/RestaurantList.tsx`**

```tsx
'use client';

import { RESTAURANTS } from '@/lib/restaurants';
import { sortRestaurants } from '@/lib/scoring';
import type { Ratings, Preferences } from '@/lib/scoring';

interface RestaurantListProps {
  ratings: Ratings;
  preferences: Preferences;
  onSelect: (restaurant: string) => void;
}

export function RestaurantList({ ratings, preferences, onSelect }: RestaurantListProps) {
  const sorted = sortRestaurants(RESTAURANTS, ratings, preferences);

  return (
    <ul className="restaurant-list">
      {sorted.map((name) => {
        const score = ratings[name];
        const rated = score !== undefined;
        return (
          <li key={name}>
            <button
              className={`restaurant-btn ${rated ? 'rated' : 'unrated'}`}
              onClick={() => onSelect(name)}
            >
              <span className="restaurant-name">{name}</span>
              <span className={`restaurant-score ${rated ? '' : 'dim'}`}>
                {rated ? `${score}/10` : 'Unranked'}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/RestaurantList.tsx
git commit -m "feat: add RestaurantList component with sorted, rated/unrated states"
```

---

## Task 12: UsernameEntry and HomeClient Components

**Files:**
- Create: `src/components/UsernameEntry.tsx`
- Create: `src/components/HomeClient.tsx`

- [ ] **Step 1: Create `src/components/UsernameEntry.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function UsernameEntry() {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const username = value.trim();
    if (!username) {
      setError('Please enter a username');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <div className="username-entry">
      <h1 className="entry-title">🍗 Tendies</h1>
      <p className="entry-subtitle">Rate the best chicken tenders around.</p>
      <form onSubmit={handleSubmit} className="entry-form">
        <input
          className="entry-input"
          type="text"
          placeholder="Enter your name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          maxLength={30}
        />
        {error && <p className="entry-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Let\'s go'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/components/HomeClient.tsx`**

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantList } from './RestaurantList';
import { RatingSheet } from './RatingSheet';
import { TiebreakerSheet } from './TiebreakerSheet';
import { getNewTiePairs } from '@/lib/scoring';
import { RESTAURANTS } from '@/lib/restaurants';
import type { Ratings, Preferences } from '@/lib/scoring';

interface HomeClientProps {
  username: string;
  initialRatings: Ratings;
  initialPreferences: Preferences;
}

interface TiePair {
  a: string;
  b: string;
  score: number;
}

export function HomeClient({ username, initialRatings, initialPreferences }: HomeClientProps) {
  const [ratings, setRatings] = useState<Ratings>(initialRatings);
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [activeRestaurant, setActiveRestaurant] = useState<string | null>(null);
  const [tiePairs, setTiePairs] = useState<TiePair[] | null>(null);
  const router = useRouter();

  const ratedCount = Object.keys(ratings).length;

  async function handleSubmitRating(score: number) {
    if (!activeRestaurant) return;
    await fetch('/api/ratings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant: activeRestaurant, score }),
    });

    const newRatings = { ...ratings, [activeRestaurant]: score };
    setRatings(newRatings);
    setActiveRestaurant(null);

    const pairs = getNewTiePairs(activeRestaurant, score, ratings, preferences);
    if (pairs.length > 0) {
      setTiePairs(
        pairs.map(([a, b]) => ({ a, b, score }))
      );
    }
  }

  async function handleTiebreakerComplete(
    results: Array<{ a: string; b: string; winner: string }>
  ) {
    await Promise.all(
      results.map((r) =>
        fetch('/api/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(r),
        })
      )
    );
    const newPrefs = { ...preferences };
    for (const { a, b, winner } of results) {
      const key = [a, b].sort().join('||');
      newPrefs[key] = winner;
    }
    setPreferences(newPrefs);
    setTiePairs(null);
  }

  return (
    <div className="home">
      <header className="home-header">
        <h1 className="home-title">Tendies</h1>
        <button className="btn-ghost btn-sm" onClick={() => router.push('/totals')}>
          Totals
        </button>
      </header>
      <p className="home-progress">
        {ratedCount}/{RESTAURANTS.length} rated
        {ratedCount < RESTAURANTS.length && ' — rate them all!'}
      </p>

      <RestaurantList
        ratings={ratings}
        preferences={preferences}
        onSelect={setActiveRestaurant}
      />

      {activeRestaurant && (
        <RatingSheet
          restaurant={activeRestaurant}
          existingScore={ratings[activeRestaurant]}
          onSubmit={handleSubmitRating}
          onClose={() => setActiveRestaurant(null)}
        />
      )}

      {tiePairs && (
        <TiebreakerSheet
          pairs={tiePairs}
          onComplete={handleTiebreakerComplete}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/UsernameEntry.tsx src/components/HomeClient.tsx
git commit -m "feat: add UsernameEntry and HomeClient components"
```

---

## Task 13: Home Page and Totals Page

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/totals/page.tsx`

- [ ] **Step 1: Implement `src/app/page.tsx`**

```tsx
import { cookies } from 'next/headers';
import redis from '@/lib/redis';
import { UsernameEntry } from '@/components/UsernameEntry';
import { HomeClient } from '@/components/HomeClient';

export default async function Page() {
  const cookieStore = cookies();
  const username = cookieStore.get('tendies_username')?.value;

  if (!username) {
    return <UsernameEntry />;
  }

  const [rawRatings, rawPreferences] = await Promise.all([
    redis.hgetall(`ratings:${username}`),
    redis.hgetall(`preferences:${username}`),
  ]);

  const ratings: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawRatings ?? {})) {
    ratings[k] = parseInt(v, 10);
  }

  return (
    <HomeClient
      username={username}
      initialRatings={ratings}
      initialPreferences={rawPreferences ?? {}}
    />
  );
}
```

- [ ] **Step 2: Create `src/app/totals/page.tsx`**

```tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import redis from '@/lib/redis';
import { RESTAURANTS } from '@/lib/restaurants';
import { calcMatchScore } from '@/lib/scoring';
import Link from 'next/link';

export default async function TotalsPage() {
  const cookieStore = cookies();
  const username = cookieStore.get('tendies_username')?.value;
  if (!username) redirect('/');

  const users = await redis.smembers('users');

  const allRatings: Record<string, Record<string, number>> = {};
  await Promise.all(
    users.map(async (user) => {
      const raw = await redis.hgetall(`ratings:${user}`);
      const ratings: Record<string, number> = {};
      for (const [k, v] of Object.entries(raw ?? {})) {
        ratings[k] = parseInt(v, 10);
      }
      allRatings[user] = ratings;
    })
  );

  const totals: Record<string, { sum: number; count: number }> = {};
  for (const r of RESTAURANTS) totals[r] = { sum: 0, count: 0 };
  for (const ratings of Object.values(allRatings)) {
    for (const [r, score] of Object.entries(ratings)) {
      if (totals[r]) {
        totals[r].sum += score;
        totals[r].count++;
      }
    }
  }

  const aggregateAverages: Record<string, number> = {};
  const restaurants = [...RESTAURANTS]
    .map((r) => {
      const { sum, count } = totals[r];
      const average = count > 0 ? Math.round((sum / count) * 10) / 10 : null;
      if (average !== null) aggregateAverages[r] = average;
      return { name: r, average, count };
    })
    .sort((a, b) => {
      if (a.average === null && b.average === null) return 0;
      if (a.average === null) return 1;
      if (b.average === null) return -1;
      return b.average - a.average;
    });

  const userBreakdown = users
    .map((user) => ({
      username: user,
      ratingCount: Object.keys(allRatings[user]).length,
      matchScore: calcMatchScore(allRatings[user], aggregateAverages),
    }))
    .sort((a, b) => {
      if (a.matchScore === null && b.matchScore === null) return 0;
      if (a.matchScore === null) return 1;
      if (b.matchScore === null) return -1;
      return b.matchScore - a.matchScore;
    });

  return (
    <div className="totals">
      <header className="totals-header">
        <Link href="/" className="btn-ghost btn-sm">← Back</Link>
        <h1 className="totals-title">Aggregate Rankings</h1>
      </header>

      <section className="totals-section">
        <h2 className="section-heading">Restaurants</h2>
        <ul className="totals-list">
          {restaurants.map((r) => (
            <li key={r.name} className="totals-row">
              <span className="totals-name">{r.name}</span>
              <span className="totals-avg">
                {r.average !== null ? r.average.toFixed(1) : '—'}
              </span>
              <span className="totals-count">
                {r.count > 0 ? `${r.count} user${r.count !== 1 ? 's' : ''}` : '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="totals-section">
        <h2 className="section-heading">Users</h2>
        <ul className="totals-list">
          {userBreakdown.map((u) => (
            <li key={u.username} className="totals-row">
              <span className="totals-name">{u.username}</span>
              <span className="totals-count">{u.ratingCount}/{RESTAURANTS.length} rated</span>
              <span className="totals-avg">
                {u.matchScore !== null ? `${u.matchScore}%` : '—'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx src/app/totals/page.tsx
git commit -m "feat: add home page and totals page"
```

---

## Task 14: Global Styles and Layout

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Replace `src/app/globals.css`**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0a0a0a;
  --surface: #141414;
  --surface2: #1e1e1e;
  --border: #2a2a2a;
  --text: #f0f0f0;
  --text-dim: #666;
  --accent: #e8a020;
  --accent-fg: #000;
  --radius: 12px;
  --sheet-radius: 20px;
}

html, body { height: 100%; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
}

/* Buttons */
.btn-primary {
  background: var(--accent);
  color: var(--accent-fg);
  border: none;
  border-radius: var(--radius);
  padding: 14px 24px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
}
.btn-primary.btn-sm { width: auto; padding: 8px 16px; font-size: 14px; }
.btn-primary:disabled { opacity: 0.5; cursor: default; }

.btn-ghost {
  background: transparent;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 24px;
  font-size: 14px;
  cursor: pointer;
  width: 100%;
}
.btn-ghost.btn-sm { width: auto; padding: 8px 14px; }

/* Username Entry */
.username-entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 32px 24px;
  gap: 12px;
  text-align: center;
}
.entry-title { font-size: 48px; font-weight: 900; }
.entry-subtitle { color: var(--text-dim); margin-bottom: 12px; }
.entry-form { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 320px; }
.entry-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text);
  font-size: 18px;
  padding: 14px 16px;
  width: 100%;
  outline: none;
}
.entry-input:focus { border-color: var(--accent); }
.entry-error { color: #e05; font-size: 13px; }

/* Home */
.home { padding: 0 0 80px; }
.home-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 8px;
}
.home-title { font-size: 22px; font-weight: 800; }
.home-progress { padding: 0 20px 16px; font-size: 13px; color: var(--text-dim); }

/* Restaurant List */
.restaurant-list { list-style: none; display: flex; flex-direction: column; gap: 8px; padding: 0 16px; }
.restaurant-btn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  color: var(--text);
  font-size: 16px;
  cursor: pointer;
  text-align: left;
}
.restaurant-btn.rated { border-color: var(--border); }
.restaurant-name { font-weight: 600; }
.restaurant-score { font-weight: 700; font-size: 15px; }
.restaurant-score.dim { color: var(--text-dim); font-weight: 400; font-size: 13px; }

/* Bottom Sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}
.sheet {
  background: var(--surface);
  border-radius: var(--sheet-radius) var(--sheet-radius) 0 0;
  padding: 12px 24px 40px;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.sheet-handle {
  width: 40px;
  height: 4px;
  background: var(--border);
  border-radius: 2px;
  margin: 0 auto 4px;
}
.sheet-title { font-size: 22px; font-weight: 800; text-align: center; }
.sheet-hint { color: var(--text-dim); font-size: 13px; text-align: center; }
.sheet-progress { font-size: 13px; color: var(--accent); font-weight: 700; text-align: center; text-transform: uppercase; letter-spacing: 0.5px; }

/* Swipe Card */
.swipe-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 16px 0;
}
.swipe-score { font-size: 72px; font-weight: 900; color: var(--accent); line-height: 1; min-width: 80px; text-align: center; }
.swipe-arrow {
  background: var(--surface2);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: var(--radius);
  font-size: 22px;
  width: 52px;
  height: 52px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Tiebreaker */
.tiebreaker-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
  cursor: pointer;
}
.tiebreaker-vs { text-align: center; color: var(--text-dim); font-weight: 700; font-size: 13px; }
.card-name { font-weight: 700; font-size: 17px; }
.card-score { font-size: 12px; color: var(--text-dim); margin-top: 2px; }

/* Totals */
.totals { padding: 0 0 60px; }
.totals-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 20px 8px;
}
.totals-title { font-size: 20px; font-weight: 800; }
.totals-section { padding: 16px; }
.section-heading { font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-dim); margin-bottom: 10px; }
.totals-list { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.totals-row {
  display: flex;
  align-items: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  gap: 8px;
}
.totals-name { flex: 1; font-weight: 600; font-size: 15px; }
.totals-avg { font-weight: 700; font-size: 15px; color: var(--accent); min-width: 40px; text-align: right; }
.totals-count { font-size: 12px; color: var(--text-dim); min-width: 70px; text-align: right; }
```

- [ ] **Step 2: Replace `src/app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tendies',
  description: 'Rate the best chicken tenders',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx
git commit -m "feat: add global styles and mobile-optimized layout"
```

---

## Task 15: Smoke Test

- [ ] **Step 1: Run all tests one final time**

```bash
npx jest
```

Expected: All tests PASS.

- [ ] **Step 2: Start Redis and dev server**

```bash
# Terminal 1
redis-server

# Terminal 2
npm run dev
```

- [ ] **Step 3: Manual smoke test checklist**

Open http://localhost:3000 on mobile (or use browser DevTools mobile emulation):

- [ ] First visit shows username entry screen
- [ ] Submitting a username redirects to home page with all 10 restaurants listed as "Unranked"
- [ ] Progress shows "0/10 rated"
- [ ] Tapping a restaurant opens the rating sheet
- [ ] Swiping right increases score; swiping left decreases it; arrow buttons work
- [ ] Submitting a rating closes the sheet and updates the list order
- [ ] Rating two restaurants the same score triggers the tie-breaker sheet
- [ ] Picking a winner or keeping the tie dismisses the sheet and updates list order
- [ ] "Totals" button navigates to `/totals`
- [ ] Totals page shows restaurants sorted by average and user breakdown
- [ ] Refreshing the page restores the previous session (cookie persists)

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: final smoke test passed — tendies app complete"
```
