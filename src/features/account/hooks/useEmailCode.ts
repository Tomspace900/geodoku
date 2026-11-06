import { useCallback } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { authClient } from "@/lib/authClient";
import {
  type SendOutcome,
  sendOutcome,
  type VerifyOutcome,
  verifyOutcome,
} from "../logic/codeOutcome";

/** En-têtes lus par `sendVerificationOTP` (`convex/auth.ts`). */
const LOCALE_HEADER = "x-geodoku-locale";
const PURPOSE_HEADER = "x-geodoku-purpose";

export type CodePurpose = "sign-in" | "delete-account";

/**
 * Envoi et vérification d'un code par e-mail (#155). La suppression du compte
 * réutilise la connexion par code : elle donne la session « fraîche » que
 * Better Auth exige pour supprimer sans mot de passe, et vaut confirmation.
 */
export function useEmailCode(purpose: CodePurpose) {
  const { locale } = useLocale();

  const send = useCallback(
    async (email: string): Promise<SendOutcome> => {
      try {
        const { error } = await authClient.emailOtp.sendVerificationOtp({
          email: email.trim(),
          type: "sign-in",
          fetchOptions: {
            headers: { [LOCALE_HEADER]: locale, [PURPOSE_HEADER]: purpose },
          },
        });
        return sendOutcome(error);
      } catch {
        return "offline";
      }
    },
    [locale, purpose],
  );

  const verify = useCallback(
    async (email: string, otp: string): Promise<VerifyOutcome> => {
      try {
        const { error } = await authClient.signIn.emailOtp({
          email: email.trim(),
          otp,
        });
        return verifyOutcome(error);
      } catch {
        return "offline";
      }
    },
    [],
  );

  return { send, verify };
}
