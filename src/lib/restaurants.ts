import type { Redis } from '@upstash/redis';

export const DEFAULT_RESTAURANTS = [
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

export async function getRestaurants(redis: Redis): Promise<string[]> {
  const list = await redis.lrange('restaurants', 0, -1);
  if (list.length > 0) return list.map(String);
  await redis.rpush('restaurants', ...DEFAULT_RESTAURANTS);
  return [...DEFAULT_RESTAURANTS];
}
