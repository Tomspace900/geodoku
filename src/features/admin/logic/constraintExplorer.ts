import type { ConstraintId } from "@/features/game/logic/constraints";

export type ConstraintAnswerSets = ReadonlyMap<
  ConstraintId,
  ReadonlySet<string>
>;

export type ConstraintCandidateMetric = {
  resultingCount: number;
  overlapCoefficient: number;
};

/** Intersection exacte des listes sélectionnées. Sans sélection, aucun résultat. */
export function intersectSelectedConstraints(
  selectedIds: readonly ConstraintId[],
  answerSets: ConstraintAnswerSets,
): Set<string> {
  const [firstId, ...otherIds] = selectedIds;
  if (!firstId) return new Set();

  const firstAnswers = answerSets.get(firstId);
  if (!firstAnswers) return new Set();

  return new Set(
    [...firstAnswers].filter((countryCode) =>
      otherIds.every((constraintId) =>
        answerSets.get(constraintId)?.has(countryCode),
      ),
    ),
  );
}

/**
 * Mesure l'ajout d'une contrainte avec le coefficient du générateur :
 * |sélection ∩ candidate| / min(|sélection|, |candidate|).
 */
export function constraintCandidateMetric(
  selectedAnswers: ReadonlySet<string>,
  candidateAnswers: ReadonlySet<string>,
): ConstraintCandidateMetric {
  const resultingCount = [...selectedAnswers].filter((countryCode) =>
    candidateAnswers.has(countryCode),
  ).length;
  const denominator = Math.min(selectedAnswers.size, candidateAnswers.size);

  return {
    resultingCount,
    overlapCoefficient: denominator === 0 ? 0 : resultingCount / denominator,
  };
}
