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
