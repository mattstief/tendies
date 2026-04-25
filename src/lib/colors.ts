export function scoreToColor(score: number): string {
  const s = Math.max(1, Math.min(10, score));
  // hue: 0 (red) at 1 → 45 (amber) at 5 → 140 (green) at 10
  const h = s <= 5
    ? (s - 1) / 4 * 45
    : 45 + (s - 5) / 5 * 95;
  return `hsl(${Math.round(h)}, 80%, 48%)`;
}
