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
  if (common.length < 5) return null;

  const totalDeviation = common.reduce((sum, r) => {
    return sum + Math.abs(userRatings[r] - aggregateAverages[r]) / 9;
  }, 0);

  return Math.round(100 * (1 - totalDeviation / common.length));
}
