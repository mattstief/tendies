'use client';

import { sortRestaurants } from '@/lib/scoring';
import type { Ratings, Preferences } from '@/lib/scoring';

interface RestaurantListProps {
  restaurants: string[];
  ratings: Ratings;
  preferences: Preferences;
  onSelect: (restaurant: string) => void;
}

export function RestaurantList({ restaurants, ratings, preferences, onSelect }: RestaurantListProps) {
  const sorted = sortRestaurants(restaurants, ratings, preferences);

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
