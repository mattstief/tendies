'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RestaurantList } from './RestaurantList';
import { RatingSheet } from './RatingSheet';
import { TiebreakerSheet } from './TiebreakerSheet';
import { getNewTiePairs } from '@/lib/scoring';
import { RESTAURANTS } from '@/lib/restaurants';
import type { Ratings, Preferences } from '@/lib/scoring';

interface HomeClientProps {
  initialRatings: Ratings;
  initialPreferences: Preferences;
}

interface TiePair {
  a: string;
  b: string;
  score: number;
}

export function HomeClient({ initialRatings, initialPreferences }: HomeClientProps) {
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
