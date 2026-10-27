import type { DifficultyRating } from "../types";

const DIFFICULTY_RATINGS: readonly DifficultyRating[] = [
  "too_easy",
  "balanced",
  "too_hard",
];

export function isDifficultyRating(value: unknown): value is DifficultyRating {
  return DIFFICULTY_RATINGS.includes(value as DifficultyRating);
}
