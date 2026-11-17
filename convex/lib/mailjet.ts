const MAILJET_URL = "https://api.mailjet.com/v3.1/send";

export type OutgoingEmail = {
  from: { email: string; name: string };
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

/** Les deux clés Mailjet sont posées sur ce déploiement. */
export function hasMailjetKeys(): boolean {
  return Boolean(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);
}

/**
 * Envoie un e-mail par Mailjet (société française, données en Europe), sans
 * pixel d'ouverture ni lien réécrit. Seul appel au service, pour les codes de
 * connexion comme pour les alertes : en changer ne touche que cette fonction.
 * Lève si les clés manquent ou si Mailjet refuse.
 */
export async function sendMailjetEmail(email: OutgoingEmail): Promise<void> {
  const apiKey = process.env.MAILJET_API_KEY;
  const secretKey = process.env.MAILJET_SECRET_KEY;
  if (!apiKey || !secretKey) {
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
          From: { Email: email.from.email, Name: email.from.name },
          To: [{ Email: email.to }],
          ...(email.replyTo ? { ReplyTo: { Email: email.replyTo } } : {}),
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
    // jamais renvoyer le contenu de l'e-mail.
    throw new Error(
      `Mailjet refused the email: ${response.status} ${await response.text()}`,
    );
  }
}
