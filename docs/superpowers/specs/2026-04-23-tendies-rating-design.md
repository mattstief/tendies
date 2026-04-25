# Tendies Rating App — Design Spec
_2026-04-23_

## Overview

A mobile-friendly web app for rating chicken tender restaurants on a 1–10 scale. Users build a personal ranked list, resolve ties via head-to-head matchups, and can view aggregate scores across all users at `/totals`.

---

## Stack

- **Framework:** Next.js (App Router) — handles both React frontend and API routes
- **Database:** Redis (local), accessed via `ioredis`
- **Session:** `tendies_username` cookie (client-side, persists across visits)

---

## Restaurants

McDonald's, Church's Chicken, Popeyes, Wendy's, HEB, Chick-fil-A, Sonic, Dairy Queen, Cane's, Whataburger

---

## Data Model (Redis)

```
users                        SET    all usernames ever registered

ratings:{username}           HASH   { "Popeyes": "9", "Cane's": "8", ... }
                                    Only contains restaurants the user has rated.
                                    Scores are integers 1–10.

preferences:{username}       HASH   { "Cane's||Popeyes": "Popeyes", ... }
                                    Tiebreaker results. Key is the two restaurant names
                                    joined by "||" in alphabetical order.
                                    Value is the preferred restaurant name, or "tie"
                                    if the user chose "Keep the tie".
```

Aggregates are computed on the fly by scanning all `ratings:*` keys — no separate aggregate hash. Comparisons never factor into aggregate scores.

---

## Routes

| Route | Description |
|---|---|
| `/` | Username entry if no cookie; restaurant list if cookie present |
| `/totals` | Aggregate scores + per-user match scores. Always accessible via button on home page (logged-in users only — redirects to `/` if no cookie). |

**Cookie:** `tendies_username` — set on first username submission, read on every load.

---

## Pages & UI

### Username Entry (first visit)

- Full-screen prompt asking for a username
- Single text input + submit button
- On submit: save `tendies_username` cookie, add to `users` SET, redirect to home

### Home Page (restaurant list)

- Header with app title and a "Totals" button (top right)
- Subtitle showing progress: "7/10 rated" — subtle nudge to complete all ratings
- Scrollable list of all 10 restaurants as buttons, sorted:
  1. Rated restaurants, descending by score (tie-broken order applied within same score)
  2. Unrated restaurants below, with subtle "Tap to rate" hint text
- Each button shows:
  - Left: restaurant name
  - Right: numeric score (e.g. "8/10") if rated, or dim "Unranked" if not

### Rating Sheet (bottom sheet, triggered by tapping a restaurant)

- Shows restaurant name as heading
- Swipe card UI:
  - Large current score displayed centrally (starts at existing score if re-rating, else 5)
  - Swipe right → score increases by 1 (max 10)
  - Swipe left → score decreases by 1 (min 1)
  - Left/right arrows also tappable for accessibility
- "Submit [score]/10" button at bottom
- On submit:
  - Save rating to Redis
  - Close sheet
  - Reorder list
  - If new rating equals any existing rated restaurant's score → open tie-breaker sheet with only the new pairings (existing same-score pairs already have stored preferences and are not re-run)

### Tie-breaker Sheet (bottom sheet, auto-opened after a rating creates a tie)

- Progress indicator: "Matchup 1 of 3"
- Subtitle: "Both rated [score] — pick your favorite"
- Two stacked restaurant cards, each with a "Pick this" button
- "They're equal — keep the tie" option below
- On pick: record preference, advance to next matchup or close if done
- After all matchups: list reorders with tie-broken ordering applied
- If user previously resolved a tie and now re-rates one of the pair to a different score, the stored preference is retained but has no effect on ordering until a tie re-occurs

### Totals Page (`/totals`)

- Header: "Aggregate Rankings"
- Section 1 — Restaurant leaderboard:
  - All 10 restaurants sorted by aggregate average score (descending)
  - Each row: restaurant name | average score (1 decimal) | "X users rated"
  - Unrated restaurants (no data) shown at bottom with "—"
- Section 2 — User breakdown:
  - Table: username | ratings submitted (e.g. "8/10") | match score
  - Match score: how closely the user's ratings correlate with aggregate averages
  - Formula: `100 * (1 - avg(|user_score - avg_score| / 9))` across all restaurants both the user and aggregate have data for. Shown as a percentage (e.g. "87%").
  - Users with 0 ratings show "—" for match score
  - Sorted by match score descending

---

## Tie-breaking Sort Logic

Within a group of restaurants sharing the same numeric score, order is determined by win count from pairwise preference matchups:

1. For each restaurant in the tied group, count wins from stored preferences — only considering matchups between restaurants in that same score group
2. Sort by win count descending
3. If win counts are also tied (including cycles like A > B > C > A), those restaurants remain in a stable tie

---

## API Routes

```
POST /api/register              { username }           → set cookie, add to users SET
GET  /api/ratings               (reads cookie)         → { ratings, preferences }
POST /api/ratings               { restaurant, score }  → save rating
POST /api/preferences           { a, b, winner }       → save tiebreaker preference
GET  /api/totals                                       → aggregate scores + user breakdown
```

---

## Non-Goals

- No authentication — usernames are trust-based, no passwords
- No ability to delete or reset ratings (for now)
- No real-time sync between devices for the same username
