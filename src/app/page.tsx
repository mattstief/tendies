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
