export function scoreToColor(score: number): string {
  const s = Math.max(1, Math.min(10, score));
  // hue: 0 (coral red) at 1 → 40 (sandy amber) at 5 → 170 (seafoam teal) at 10
  const h = s <= 5
    ? (s - 1) / 4 * 40
    : 40 + (s - 5) / 5 * 130;
  return `hsl(${Math.round(h)}, 80%, 52%)`;
}
