/**
 * L'e-mail du code (#155), en français ou en anglais selon la page au moment
 * de la demande. Le code est dans l'objet (on le lit sans ouvrir l'e-mail) et
 * d'un seul tenant dans le corps, pour la suggestion du clavier et le
 * copier-coller. Même objet pour la connexion, le changement d'adresse et la
 * suppression du compte.
 */

export type CodeEmailLocale = "fr" | "en";
export type CodeEmailPurpose = "sign-in" | "change-email" | "delete-account";

export const CODE_EMAIL_FROM = { email: "compte@geodoku.app", name: "Geodoku" };
export const CODE_EMAIL_REPLY_TO = { email: "support@geodoku.app" };

const SITE = "geodoku.app";
/**
 * Le logo à fond transparent (`favicon.svg` rendu à 96 px, affiché à 24) :
 * l'icône de l'appli a son propre fond, et Gmail n'affiche pas le SVG. Servi
 * par la prod : sur develop, l'image n'existe qu'une fois la prod déployée.
 */
const LOGO_URL = "https://www.geodoku.app/email-logo.png";

/** Espace insécable : « compte : » et « demandé ? » ne se coupent pas. */
const NBSP = "\u00A0";

const TEXTS = {
  fr: {
    subject: (otp: string) => `${otp} est ton code Geodoku`,
    "sign-in": `Ton code pour te connecter${NBSP}:`,
    "change-email": `Ton code pour changer d'adresse e-mail${NBSP}:`,
    "delete-account": `Ton code pour supprimer ton compte${NBSP}:`,
    validity: "Il vaut 5 minutes.",
    ignore: `Tu n'as rien demandé${NBSP}? Ignore cet e-mail.`,
  },
  en: {
    subject: (otp: string) => `${otp} is your Geodoku code`,
    "sign-in": "Your code to sign in:",
    "change-email": "Your code to change your email address:",
    "delete-account": "Your code to delete your account:",
    validity: "It's valid for 5 minutes.",
    ignore: "Didn't ask for it? Ignore this email.",
  },
} as const;

export type CodeEmail = { subject: string; html: string; text: string };

/** « e-mail » ne se coupe pas au trait d'union en fin de ligne. */
function keepTogether(text: string): string {
  return text.replace(
    /e-mail/g,
    '<span style="white-space:nowrap;">e-mail</span>',
  );
}

/** Le code n'a que des chiffres : rien à échapper ; le reste est notre texte. */
export function buildCodeEmail({
  otp,
  locale,
  purpose,
}: {
  otp: string;
  locale: CodeEmailLocale;
  purpose: CodeEmailPurpose;
}): CodeEmail {
  const t = TEXTS[locale];
  const lead = t[purpose];
  const text = [lead, "", otp, "", t.validity, "", t.ignore, "", SITE].join(
    "\n",
  );
  const html = `<!doctype html>
<html lang="${locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${t.subject(otp)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f1f3f3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#2d3435;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;">
<tr><td style="padding:36px 32px;">
<p style="margin:0 0 28px;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:22px;color:#2d3435;"><img src="${LOGO_URL}" width="24" height="24" alt="" style="vertical-align:-5px;margin-right:8px;border:0;">Geodoku</p>
<p style="margin:0 0 6px;font-size:17px;">${keepTogether(lead)}</p>
<p style="margin:4px 0 16px;line-height:1.1;"><span style="display:inline-block;padding:12px 18px 12px 24px;background:#f2f4f4;border-radius:14px;font-family:Georgia,'Times New Roman',serif;font-size:44px;font-weight:600;letter-spacing:6px;color:#2d3435;">${otp}</span></p>
<p style="margin:0 0 24px;font-size:15px;color:#5a6061;">${t.validity}</p>
<p style="margin:0 0 32px;font-size:15px;color:#5a6061;">${keepTogether(t.ignore)}</p>
<p style="margin:0;font-size:13px;color:#5a6061;">${SITE}</p>
</td></tr>
</table>
</body>
</html>`;
  return { subject: t.subject(otp), html, text };
}
