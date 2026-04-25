export const RESTAURANTS = [
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

export type Restaurant = (typeof RESTAURANTS)[number];
