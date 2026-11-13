import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

/**
 * Un code vaut 5 minutes (`expiresIn`, `convex/auth.ts`). Envoyé il y a moins
 * de 4 minutes, il resert : relancer le parcours (le tiroir s'est fermé
 * pendant qu'on allait lire ses e-mails) ramène à la saisie du code sans
 * renvoyer d'e-mail, et le code a encore au moins une minute devant lui.
 */
export const CODE_REUSE_MS = 4 * 60_000;

/** Heure d'envoi du dernier code, par objet et par adresse. */
export type RecentCodes = Readonly<Record<string, number>>;

export function codeKey(purpose: string, email: string): string {
  return `${purpose}:${email.trim().toLowerCase()}`;
}

/** L'heure d'envoi d'un code encore bon à resservir, sinon `null`. */
export function reusableSentAt(
  codes: RecentCodes,
  key: string,
  now: number,
): number | null {
  const sentAt = codes[key];
  if (sentAt === undefined) return null;
  const age = now - sentAt;
  return age >= 0 && age < CODE_REUSE_MS ? sentAt : null;
}

/** Les codes encore bons, plus celui qu'on vient d'envoyer. */
export function withSentCode(
  codes: RecentCodes,
  key: string,
  now: number,
): RecentCodes {
  const kept = Object.entries(codes).filter(
    ([other]) => reusableSentAt(codes, other, now) !== null,
  );
  return { ...Object.fromEntries(kept), [key]: now };
}

/** Un code utilisé ou mort ne resert plus. */
export function withoutCode(codes: RecentCodes, key: string): RecentCodes {
  return Object.fromEntries(
    Object.entries(codes).filter(([other]) => other !== key),
  );
}

export function loadRecentCodes(): RecentCodes {
  try {
    const raw: unknown = JSON.parse(
      safeGet(STORAGE_KEYS.recentCodes, "session") ?? "{}",
    );
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(
      Object.entries(raw).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === "number" && Number.isFinite(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

export function saveRecentCodes(codes: RecentCodes): void {
  safeSet(STORAGE_KEYS.recentCodes, JSON.stringify(codes), "session");
}
