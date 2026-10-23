import { Component, type ReactNode } from "react";
import { isReplayableDate } from "@/features/game/logic/replayWindow";
import { todayUTC } from "@/lib/dates";

type Props = { date: string; fallback: ReactNode; children: ReactNode };
type State = { failed: boolean; error: unknown };

/**
 * Grille d'entraînement ouverte la veille, reprise après minuit UTC : la date
 * est sortie de la fenêtre J-1 → J-7, et la souscription Convex, réévaluée au
 * réveil de l'onglet, lève (`assertReplayableDate`). Le garde d'URL de
 * `TrainingPage` ne le voit pas, il a classé la date au montage. On rend alors
 * `fallback` (retour à l'archive) au lieu de l'écran « crashed ».
 *
 * Toute autre erreur, ou une date encore rejouable, remonte à la barrière
 * globale : seul le cas expliqué ici est attendu.
 */
export class ExpiredReplayBoundary extends Component<Props, State> {
  state: State = { failed: false, error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { failed: true, error };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    if (!isReplayableDate(this.props.date, todayUTC())) {
      return this.props.fallback;
    }
    throw this.state.error;
  }
}
