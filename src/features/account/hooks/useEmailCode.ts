import { useCallback } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { authClient } from "@/lib/authClient";
import {
  type SendOutcome,
  sendOutcome,
  type VerifyOutcome,
  verifyOutcome,
} from "../logic/codeOutcome";
import {
  codeKey,
  loadRecentCodes,
  reusableSentAt,
  saveRecentCodes,
  withoutCode,
  withSentCode,
} from "../logic/recentCodes";

/** En-têtes lus par `sendVerificationOTP` (`convex/auth.ts`). */
const LOCALE_HEADER = "x-geodoku-locale";
const PURPOSE_HEADER = "x-geodoku-purpose";

export type CodePurpose = "sign-in" | "change-email" | "delete-account";

/**
 * Envoi et vérification d'un code par e-mail (#155). La suppression du compte
 * réutilise la connexion par code : elle donne la session « fraîche » que
 * Better Auth exige pour supprimer sans mot de passe, et vaut confirmation.
 * Changer d'e-mail envoie le code à la nouvelle adresse, qui ne remplace
 * l'ancienne qu'une fois le code saisi.
 *
 * Un code encore bon n'est pas renvoyé quand on relance le parcours (le
 * tiroir s'est fermé pendant qu'on lisait ses e-mails) : `send` le resert,
 * sauf `reuse: false` (« Renvoyer le code »).
 */
export function useEmailCode(purpose: CodePurpose) {
  const { locale } = useLocale();

  /** Heure d'envoi d'un code encore bon pour cette adresse, sinon `null`. */
  const sentAt = useCallback(
    (email: string): number | null =>
      reusableSentAt(loadRecentCodes(), codeKey(purpose, email), Date.now()),
    [purpose],
  );

  const send = useCallback(
    async (
      email: string,
      { reuse = true }: { reuse?: boolean } = {},
    ): Promise<SendOutcome> => {
      if (reuse && sentAt(email) !== null) return "sent";
      const fetchOptions = {
        headers: { [LOCALE_HEADER]: locale, [PURPOSE_HEADER]: purpose },
      };
      try {
        const { error } =
          purpose === "change-email"
            ? await authClient.emailOtp.requestEmailChange({
                newEmail: email.trim(),
                fetchOptions,
              })
            : await authClient.emailOtp.sendVerificationOtp({
                email: email.trim(),
                type: "sign-in",
                fetchOptions,
              });
        const outcome = sendOutcome(error);
        if (outcome === "sent") {
          saveRecentCodes(
            withSentCode(
              loadRecentCodes(),
              codeKey(purpose, email),
              Date.now(),
            ),
          );
        }
        return outcome;
      } catch {
        return "offline";
      }
    },
    [locale, purpose, sentAt],
  );

  const verify = useCallback(
    async (email: string, otp: string): Promise<VerifyOutcome> => {
      try {
        const { error } =
          purpose === "change-email"
            ? await authClient.emailOtp.changeEmail({
                newEmail: email.trim(),
                otp,
              })
            : await authClient.signIn.emailOtp({ email: email.trim(), otp });
        const outcome = verifyOutcome(error);
        // Utilisé ou mort, le code ne resert plus : le prochain parcours en
        // demande un nouveau.
        if (
          outcome === "ok" ||
          outcome === "expired" ||
          outcome === "too_many_attempts"
        ) {
          saveRecentCodes(
            withoutCode(loadRecentCodes(), codeKey(purpose, email)),
          );
        }
        return outcome;
      } catch {
        return "offline";
      }
    },
    [purpose],
  );

  return { send, verify, sentAt };
}
