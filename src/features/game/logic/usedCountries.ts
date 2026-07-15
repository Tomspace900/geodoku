import type { Cell } from "@/features/game/types";

/** Dérive les codes déjà joués depuis la seule source de vérité : les cases. */
export function getUsedCountryCodes(
  cells: Readonly<Record<string, Cell>>,
): Set<string> {
  return new Set(
    Object.values(cells).flatMap((cell) =>
      cell.status === "filled" ? [cell.countryCode] : [],
    ),
  );
}
