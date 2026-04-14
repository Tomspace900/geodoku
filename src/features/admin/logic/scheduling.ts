/** Formate une Date JS locale en chaîne YYYY-MM-DD. */
export function dateToStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Retourne la première date YYYY-MM-DD ≥ aujourd'hui absente de scheduledDates.
 * Cherche jusqu'à un an dans le futur.
 */
export function getNextAvailableDate(
  scheduledDates: ReadonlySet<string>,
): string {
  const date = new Date();
  for (let i = 0; i < 365; i++) {
    const str = dateToStr(date);
    if (!scheduledDates.has(str)) return str;
    date.setDate(date.getDate() + 1);
  }
  // Cas extrême : plus d'un an de grilles planifiées, on prend l'année suivante
  return dateToStr(date);
}
