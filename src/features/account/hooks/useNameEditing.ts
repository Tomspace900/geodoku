import { useMutation } from "convex/react";
import { useState } from "react";
import type { TKey } from "@/i18n/types";
import { api } from "../../../../convex/_generated/api";
import { pseudoErrorKey, refusalKey } from "../logic/pseudoMessage";

/**
 * Le nom d'un compte, écrit sur place (#155) : titre de « Mes stats » et
 * « Mon compte ». Rien n'est enregistré avant `commit` (Entrée, tap ailleurs,
 * fermeture) ; chaque nom changé et enregistré fait avancer `savedCount`,
 * qui le fait rebondir.
 */
export function useNameEditing(saved: string) {
  const updateProfile = useMutation(api.account.updateProfile);
  // Le nom en cours d'écriture ; `null` : celui du compte.
  const [draft, setDraft] = useState<string | null>(null);
  const [serverError, setServerError] = useState<TKey | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const value = draft ?? saved;

  /** `true` : rien ne reste à enregistrer. */
  async function save(next: string): Promise<boolean> {
    try {
      const result = await updateProfile({ pseudo: next });
      if (!result.ok) {
        setServerError(refusalKey(result.reason));
        return false;
      }
    } catch {
      // Hors ligne ou trop d'écritures : le nom reste à l'écran, pas enregistré.
      setServerError("account.genericError");
      return false;
    }
    // Enregistré : le champ suit de nouveau le compte, sauf si l'on a déjà
    // réécrit par-dessus.
    setDraft((current) => (current === next ? null : current));
    setSavedCount((count) => count + 1);
    return true;
  }

  function change(next: string) {
    setDraft(next);
    setServerError(null);
  }

  /** Enregistre le nom écrit s'il a changé et s'il est valide. */
  async function commit(): Promise<boolean> {
    if (draft === null) return true;
    if (draft.trim() === saved) {
      setDraft(null);
      return true;
    }
    if (pseudoErrorKey(draft) !== null) return false;
    return await save(draft);
  }

  /** Abandonne ce qui est écrit : le champ revient au nom du compte. */
  function reset() {
    setDraft(null);
    setServerError(null);
  }

  return {
    value,
    serverError,
    /** Une erreur s'affiche sous le champ (règle locale ou refus du serveur). */
    hasError: pseudoErrorKey(value) !== null || serverError !== null,
    savedCount,
    change,
    commit,
    reset,
  };
}
