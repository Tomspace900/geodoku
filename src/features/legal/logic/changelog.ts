/** À mettre à jour quand une entrée est ajoutée en tête de `ChangelogPage` ENTRIES. */
export const LATEST_CHANGELOG_UPDATE_DATE = "2026-06-24";

const NEW_BADGE_WINDOW_MS = 72 * 60 * 60 * 1000; // 72 hours

function startOfUtcDay(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

export function isChangelogNewBadgeVisible(now = new Date()): boolean {
  const releaseAt = startOfUtcDay(LATEST_CHANGELOG_UPDATE_DATE);
  const nowMs = now.getTime();
  return nowMs >= releaseAt && nowMs < releaseAt + NEW_BADGE_WINDOW_MS;
}
