import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { recordRateLimited } from "./health";
import type { CodeEmail } from "./lib/codeEmail";
import { CODE_EMAIL_FROM, CODE_EMAIL_REPLY_TO } from "./lib/codeEmail";
import { rateLimiter } from "./rateLimit";

/**
 * Envoi d'un code peut-il partir ? Par adresse, puis globalement (quota
 * MailerSend). Un refus ne lève pas : le compteur de surveillance de la même
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

const MAILERSEND_URL = "https://api.mailersend.com/v1/email";

/**
 * Envoie l'e-mail par MailerSend (données en Europe). Seul appel au service :
 * en changer ne touche que cette fonction. Sans clé, un déploiement de dev
 * peut écrire le code dans ses logs (`LOG_AUTH_CODES=true`), jamais la prod.
 */
export async function deliverCodeEmail(
  to: string,
  email: CodeEmail,
): Promise<void> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  if (!apiKey) {
    if (process.env.LOG_AUTH_CODES === "true") {
      console.log(`[auth] ${email.subject} (${to})`);
      return;
    }
    throw new Error("MAILERSEND_API_KEY is not set");
  }
  const response = await fetch(MAILERSEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: CODE_EMAIL_FROM,
      to: [{ email: to }],
      reply_to: CODE_EMAIL_REPLY_TO,
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });
  if (!response.ok) {
    // Le corps de l'erreur MailerSend ne contient ni code ni adresse.
    throw new Error(
      `MailerSend refused the email: ${response.status} ${await response.text()}`,
    );
  }
}
