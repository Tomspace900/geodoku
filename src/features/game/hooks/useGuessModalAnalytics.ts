import { usePostHog } from "@posthog/react";
import { useEffect, useRef } from "react";
import type { GameModeId } from "@/features/game/types";

/**
 * Fin d'une ouverture de la modale de saisie : pays trouvé, fermeture sans
 * réponse, ou dernier essai raté qui clôt la partie.
 */
export type GuessModalOutcome = "found" | "dismissed" | "game_over";

type Session = {
  openedAt: number;
  queryEdits: number;
  noResultsSeen: boolean;
  failedAttempts: number;
};

/**
 * Mesure une ouverture de la modale, de l'ouverture à la fermeture, et l'émet
 * en un seul `guess_modal_closed` : combien de temps, combien de frappes,
 * recherche restée sans résultat, essais ratés. C'est ce qui dit si un joueur
 * bute à écrire ou ne trouve pas le pays.
 *
 * Une frappe est un changement de recherche venu du joueur : le vidage du
 * champ après un essai raté n'en est pas une.
 */
export function useGuessModalAnalytics({
  gridDate,
  mode,
  cellKey,
  query,
  searchable,
  resultCount,
}: {
  gridDate: string;
  mode: GameModeId;
  cellKey: string;
  query: string;
  searchable: boolean;
  resultCount: number;
}) {
  const posthog = usePostHog();
  const sessionRef = useRef<Session>({
    openedAt: performance.now(),
    queryEdits: 0,
    noResultsSeen: false,
    failedAttempts: 0,
  });
  const closedRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: one count per query change; searchable/resultCount derive from it
  useEffect(() => {
    if (query === "") return;
    sessionRef.current.queryEdits += 1;
    if (searchable && resultCount === 0) {
      sessionRef.current.noResultsSeen = true;
    }
  }, [query]);

  function recordFailedAttempt(): void {
    sessionRef.current.failedAttempts += 1;
  }

  function recordClose(outcome: GuessModalOutcome, queryLength: number): void {
    if (closedRef.current) return;
    closedRef.current = true;
    const session = sessionRef.current;
    posthog?.capture("guess_modal_closed", {
      grid_date: gridDate,
      mode,
      cell: cellKey,
      outcome,
      duration_ms: Math.round(performance.now() - session.openedAt),
      query_edits: session.queryEdits,
      no_results_seen: session.noResultsSeen,
      failed_attempts: session.failedAttempts,
      had_query: queryLength > 0,
      query_length: queryLength,
    });
  }

  return { recordFailedAttempt, recordClose };
}
