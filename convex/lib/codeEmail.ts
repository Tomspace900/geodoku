import { EMAIL_COLORS, EMAIL_SITE, renderEmailLayout } from "./emailLayout";

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
  const text = [
    lead,
    "",
    otp,
    "",
    t.validity,
    "",
    t.ignore,
    "",
    EMAIL_SITE,
  ].join("\n");
  const html = renderEmailLayout({
    lang: locale,
    title: t.subject(otp),
    body: `<p style="margin:0 0 6px;font-size:17px;">${keepTogether(lead)}</p>
<p style="margin:4px 0 16px;line-height:1.1;"><span style="display:inline-block;padding:12px 18px 12px 24px;background:${EMAIL_COLORS.panel};border-radius:14px;font-family:Georgia,'Times New Roman',serif;font-size:44px;font-weight:600;letter-spacing:6px;color:${EMAIL_COLORS.text};">${otp}</span></p>
<p style="margin:0 0 24px;font-size:15px;color:${EMAIL_COLORS.muted};">${t.validity}</p>
<p style="margin:0 0 32px;font-size:15px;color:${EMAIL_COLORS.muted};">${keepTogether(t.ignore)}</p>`,
  });
  return { subject: t.subject(otp), html, text };
}
