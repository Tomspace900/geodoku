/** À mettre à jour quand une entrée est ajoutée en tête de `ChangelogPage` ENTRIES. */
export const LATEST_CHANGELOG_UPDATE_DATE = "2026-09-10";

const NEW_BADGE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function startOfUtcDay(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function isChangelogNewBadgeVisible(now = new Date()): boolean {
  const releaseAt = startOfUtcDay(LATEST_CHANGELOG_UPDATE_DATE);
  const nowMs = now.getTime();
  return nowMs >= releaseAt && nowMs < releaseAt + NEW_BADGE_WINDOW_MS;
}
