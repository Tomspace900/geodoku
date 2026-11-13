import { useMutation } from "convex/react";
import { useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { api } from "../../../../convex/_generated/api";
import { pseudoErrorKey, refusalKey } from "../logic/pseudoMessage";

/**
 * Le nom d'un compte, écrit sur place (#155) : titre de « Mes stats » et
 * « Mon compte ». Rien n'est enregistré avant `commit` (Entrée, tap ailleurs,
 * fermeture) ; un nom tiré au dé, lui, part aussitôt, et `drawCount` avance
 * pour le faire rebondir (un nom tapé à la main ne rebondit pas).
 */
export function useNameEditing(saved: string) {
  const { locale } = useLocale();
  const updateProfile = useMutation(api.account.updateProfile);
  const drawPseudo = useMutation(api.account.drawPseudoFor);
  // Le nom en cours d'écriture ; `null` : celui du compte.
  const [draft, setDraft] = useState<string | null>(null);
  const [serverError, setServerError] = useState<TKey | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [drawCount, setDrawCount] = useState(0);
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

  async function draw() {
    setDrawing(true);
    try {
      const drawn = await drawPseudo({ locale, current: value });
      setDraft(drawn);
      setServerError(null);
      setDrawCount((count) => count + 1);
      await save(drawn);
    } catch {
      setServerError("account.genericError");
    } finally {
      setDrawing(false);
    }
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
    drawing,
    drawCount,
    change,
    commit,
    draw,
    reset,
  };
}
