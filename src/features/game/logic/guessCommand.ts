type AcceptedServerGuess = {
  kind: "accepted";
  count: number;
  total: number;
  rarity: number;
};

type RejectedServerGuess = {
  kind: "domain_rejected";
  reason: "invalid_guess";
};

export type ServerGuessResult = AcceptedServerGuess | RejectedServerGuess;

export type ValidatedGuessResult =
  | { kind: "accepted"; rarity: number }
  | { kind: "unavailable" };

/**
 * Après validation locale contre le snapshot publié, un refus serveur indique
 * une panne ou une divergence de déploiement. Il ne doit jamais être converti
 * en faute du joueur.
 */
export async function submitValidatedGuess(
  submit: () => Promise<ServerGuessResult>,
): Promise<ValidatedGuessResult> {
  try {
    const result = await submit();
    return result.kind === "accepted"
      ? { kind: "accepted", rarity: result.rarity }
      : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}
