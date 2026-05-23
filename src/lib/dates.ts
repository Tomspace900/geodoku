/** Date helpers UTC partagés (frontend + backend, format YYYY-MM-DD). */

export function offsetUTC(deltaDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + deltaDays);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayUTC(): string {
  return offsetUTC(0);
}

export function tomorrowUTC(): string {
  return offsetUTC(1);
}

export function daysAgoUTC(n: number): string {
  return offsetUTC(-n);
}

export function formatYMD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
