/** Conversions calendrier admin ↔ chaînes YYYY-MM-DD (react-day-picker). */

/** Convertit YYYY-MM-DD en Date calendrier (minuit local) pour react-day-picker. */
export function strToCalendarDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, (m as number) - 1, d as number);
}

/** Formate une Date calendrier (react-day-picker) en chaîne YYYY-MM-DD. */
export function dateToStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
