/**
 * Requête à l'API WDI de la Banque mondiale, partagée par les récoltes
 * `worldBankIndicators.ts` et `forestCover.ts`. Une page suffit
 * (`per_page=20000`) mais l'API met 35 à 40 s par indicateur : délai large et
 * quelques reprises.
 */
const REQUEST_TIMEOUT_MS = 180_000;
const MAX_ATTEMPTS = 3;

export async function fetchWdiJson(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt >= MAX_ATTEMPTS) throw new Error(`${url}: ${error}`);
      console.error(`[wdi] tentative ${attempt} échouée (${error}), reprise…`);
    }
  }
}
