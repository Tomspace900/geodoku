import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { recordRateLimited } from "./health";
import type { CodeEmail } from "./lib/codeEmail";
import { CODE_EMAIL_FROM, CODE_EMAIL_REPLY_TO } from "./lib/codeEmail";
import { hasMailjetKeys, sendMailjetEmail } from "./lib/mailjet";
import { rateLimiter } from "./rateLimit";

/**
 * Envoi d'un code peut-il partir ? Par adresse, puis globalement (quota
 * Mailjet). Un refus ne lève pas : le compteur de surveillance de la même
 * transaction doit survivre ; c'est l'appelant qui répond « trop de codes ».
 */
export const reserveCodeSend = internalMutation({
  args: { email: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const perEmail = await rateLimiter.limit(ctx, "sendCodePerEmail", {
      key: args.email,
    });
    const allowed =
      perEmail.ok && (await rateLimiter.limit(ctx, "sendCodeGlobal")).ok;
    if (!allowed) await recordRateLimited(ctx);
    return allowed;
  },
});

/**
 * Envoie l'e-mail du code par Mailjet (`lib/mailjet.ts`). Sans clés, un
 * déploiement de dev peut écrire le code dans ses logs (`LOG_AUTH_CODES=true`),
 * jamais la prod.
 */
export async function deliverCodeEmail(
  to: string,
  email: CodeEmail,
): Promise<void> {
  if (!hasMailjetKeys() && process.env.LOG_AUTH_CODES === "true") {
    console.log(`[auth] ${email.subject} (${to})`);
    return;
  }
  await sendMailjetEmail({
    from: CODE_EMAIL_FROM,
    to,
    replyTo: CODE_EMAIL_REPLY_TO.email,
    ...email,
  });
}
