'use client';

import { sortRestaurants } from '@/lib/scoring';
import { scoreToColor } from '@/lib/colors';
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
              <span className="restaurant-score-wrap">
                <span
                  className="restaurant-score"
                  style={rated ? { color: scoreToColor(score) } : undefined}
                >
                  {rated ? `${score}/10` : 'Unranked'}
                </span>
                {rated && (
                  <span
                    className="score-bar"
                    style={{
                      width: `${score / 10 * 100}%`,
                      background: scoreToColor(score),
                    }}
                  />
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
