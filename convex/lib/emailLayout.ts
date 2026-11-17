/**
 * Gabarit commun des e-mails Geodoku (code de connexion, alertes) : carte
 * blanche sur fond gris, le logo et « Geodoku » en italique, le site en pied.
 * Styles en ligne : les messageries ignorent les feuilles de style.
 */

export const EMAIL_SITE = "geodoku.app";
/**
 * Le logo à fond transparent (`favicon.svg` rendu à 96 px, affiché à 24) :
 * l'icône de l'appli a son propre fond, et Gmail n'affiche pas le SVG. Servi
 * par la prod : sur develop, l'image n'existe qu'une fois la prod déployée.
 */
const LOGO_URL = "https://www.geodoku.app/email-logo.png";

export const EMAIL_COLORS = {
  text: "#2d3435",
  muted: "#5a6061",
  panel: "#f2f4f4",
} as const;

/** Échappe un texte écrit par quelqu'un d'autre avant de l'insérer en HTML. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** `body` est du HTML déjà sûr : tout texte externe y passe par `escapeHtml`. */
export function renderEmailLayout({
  lang,
  title,
  body,
}: {
  lang: string;
  title: string;
  body: string;
}): string {
  return `<!doctype html>
<html lang="${lang}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f1f3f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${EMAIL_COLORS.text};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;">
<tr><td style="padding:36px 32px;">
<p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:22px;color:${EMAIL_COLORS.text};"><img src="${LOGO_URL}" width="24" height="24" alt="" style="vertical-align:-5px;margin-right:8px;border:0;">Geodoku</p>
${body}
<p style="margin:0;font-size:13px;color:${EMAIL_COLORS.muted};">${EMAIL_SITE}</p>
</td></tr>
</table>
</body>
</html>`;
}
