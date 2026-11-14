import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { recordRateLimited } from "./health";
import type { CodeEmail } from "./lib/codeEmail";
import { CODE_EMAIL_FROM, CODE_EMAIL_REPLY_TO } from "./lib/codeEmail";
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

const MAILJET_URL = "https://api.mailjet.com/v3.1/send";

/**
 * Envoie l'e-mail par Mailjet (société française, données en Europe), sans
 * pixel d'ouverture ni lien réécrit. Seul appel au service : en changer ne
 * touche que cette fonction. Sans clés, un déploiement de dev peut écrire le
 * code dans ses logs (`LOG_AUTH_CODES=true`), jamais la prod.
 */
export async function deliverCodeEmail(
  to: string,
  email: CodeEmail,
): Promise<void> {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  if (!apiKey || !secretKey) {
    if (process.env.LOG_AUTH_CODES === "true") {
      console.log(`[auth] ${email.subject} (${to})`);
      return;
    }
    throw new Error("MAILJET_API_KEY or MAILJET_SECRET_KEY is not set");
  }
  const response = await fetch(MAILJET_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${apiKey}:${secretKey}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: CODE_EMAIL_FROM.email, Name: CODE_EMAIL_FROM.name },
          To: [{ Email: to }],
          ReplyTo: { Email: CODE_EMAIL_REPLY_TO.email },
          Subject: email.subject,
          HTMLPart: email.html,
          TextPart: email.text,
          TrackOpens: "disabled",
          TrackClicks: "disabled",
        },
      ],
    }),
  });
  if (!response.ok) {
    // Mailjet décrit l'erreur (expéditeur non validé, clé refusée) sans
    // jamais renvoyer le contenu de l'e-mail, donc jamais le code.
    throw new Error(
      `Mailjet refused the email: ${response.status} ${await response.text()}`,
    );
  }
}
