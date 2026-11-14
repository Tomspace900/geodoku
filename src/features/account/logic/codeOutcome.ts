/**
 * Réponses de Better Auth aux deux étapes du code (#155), réduites à ce que
 * l'écran dit au joueur. Pures : testées sans réseau.
 */

export type SendOutcome = "sent" | "invalid_email" | "offline" | "too_many";
export type VerifyOutcome =
  | "ok"
  | "wrong"
  | "too_many_attempts"
  | "expired"
  | "offline";

/** Erreur de Better Auth telle que la renvoie son client. */
export type AuthClientError = {
  status?: number;
  code?: string;
} | null;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Contrôle de forme avant l'envoi : le serveur reste juge. */
export function looksLikeEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

export function sendOutcome(error: AuthClientError): SendOutcome {
  if (!error) return "sent";
  if (error.status === 429 || error.code === "TOO_MANY_CODES") {
    return "too_many";
  }
  if (error.code === "INVALID_EMAIL") return "invalid_email";
  return "offline";
}

export function verifyOutcome(error: AuthClientError): VerifyOutcome {
  if (!error) return "ok";
  if (error.code === "TOO_MANY_ATTEMPTS") return "too_many_attempts";
  if (error.code === "OTP_EXPIRED") return "expired";
  if (error.code === "INVALID_OTP") return "wrong";
  // Le code d'un compte inconnu, ou un code qui n'existe plus, ne dit rien de
  // plus au joueur qu'un mauvais code.
  if (error.status === 400 || error.status === 401) return "wrong";
  return "offline";
}

/** « 0:41 » : le décompte avant de pouvoir renvoyer le code. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}
