import {
  EMAIL_COLORS,
  EMAIL_SITE,
  escapeHtml,
  renderEmailLayout,
} from "./emailLayout";

/**
 * Les e-mails d'alerte (#127, #128), en français : ils ne vont qu'à
 * l'adresse de `ALERT_EMAIL_TO`. Même expéditeur que les codes, déjà validé
 * chez Mailjet.
 */

export const ALERT_EMAIL_FROM = {
  email: "compte@geodoku.app",
  name: "Geodoku",
};

const NBSP = " ";

export type AlertEmail = { subject: string; html: string; text: string };

/** Une ligne « libellé : valeur » du récapitulatif. */
type Fact = { label: string; value: string };

export type ReportEmailInput = {
  category: "content" | "bug";
  target:
    | {
        kind: "cell";
        rowLabel: string;
        colLabel: string;
        dateLabel: string;
        mode: "daily" | "training";
      }
    | {
        kind: "constraint";
        constraintLabel: string;
        dateLabel: string;
        mode: "daily" | "training";
      }
    | { kind: "general"; page: string };
  locale: "fr" | "en";
  /** Texte du joueur, déjà nettoyé ; échappé ici. */
  message: string;
  /** `/admin` du site, absent quand le déploiement ne connaît pas son adresse. */
  adminUrl: string | null;
};

const CATEGORY_LABEL = {
  content: "Réponse ou contrainte",
  bug: "Bug ou autre",
} as const;
const MODE_LABEL = {
  daily: "partie du jour",
  training: "entraînement",
} as const;
const LOCALE_LABEL = { fr: "français", en: "anglais" } as const;

function targetSummary(target: ReportEmailInput["target"]): string {
  if (target.kind === "cell") return `${target.rowLabel} × ${target.colLabel}`;
  if (target.kind === "constraint") return target.constraintLabel;
  return target.page;
}

function targetFacts(target: ReportEmailInput["target"]): Fact[] {
  if (target.kind === "general") return [{ label: "Page", value: target.page }];
  const grid = {
    label: "Grille",
    value: `${target.dateLabel} · ${MODE_LABEL[target.mode]}`,
  };
  return target.kind === "cell"
    ? [{ label: "Case", value: targetSummary(target) }, grid]
    : [{ label: "Contrainte", value: target.constraintLabel }, grid];
}

function factsHtml(facts: Fact[]): string {
  const rows = facts
    .map(
      ({ label, value }) =>
        `<tr><td style="padding:3px 12px 3px 0;vertical-align:top;font-size:14px;color:${EMAIL_COLORS.muted};white-space:nowrap;">${escapeHtml(label)}</td><td style="padding:3px 0;font-size:14px;color:${EMAIL_COLORS.text};">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">${rows}</table>`;
}

/**
 * L'e-mail d'un signalement : où, quoi, puis le texte du joueur en entier,
 * échappé et gardé tel qu'écrit (sauts de ligne compris). Aucun lien tiré du
 * texte : il reste du texte brut.
 */
export function buildReportEmail(input: ReportEmailInput): AlertEmail {
  const where =
    input.target.kind === "general"
      ? CATEGORY_LABEL[input.category]
      : targetSummary(input.target);
  const when =
    input.target.kind === "general"
      ? input.target.page
      : input.target.dateLabel;
  const subject = `Signalement · ${where} · ${when}`;
  const facts: Fact[] = [
    { label: "Nature", value: CATEGORY_LABEL[input.category] },
    ...targetFacts(input.target),
    { label: "Langue", value: LOCALE_LABEL[input.locale] },
  ];
  const anonymous = `Signalement anonyme${NBSP}: impossible de répondre au joueur.`;

  const html = renderEmailLayout({
    lang: "fr",
    title: subject,
    body: `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${EMAIL_COLORS.text};">Nouveau signalement</p>
${factsHtml(facts)}
<div style="margin:0 0 24px;padding:16px 18px;background:${EMAIL_COLORS.panel};border-radius:14px;font-size:16px;line-height:1.5;color:${EMAIL_COLORS.text};white-space:pre-wrap;word-wrap:break-word;">${escapeHtml(input.message)}</div>
<p style="margin:0 0 ${input.adminUrl ? "8px" : "32px"};font-size:14px;color:${EMAIL_COLORS.muted};">${anonymous}</p>
${input.adminUrl ? `<p style="margin:0 0 32px;font-size:14px;"><a href="${escapeHtml(input.adminUrl)}" style="color:${EMAIL_COLORS.text};">Le traiter dans l'admin</a></p>` : ""}`,
  });

  const text = [
    "Nouveau signalement",
    "",
    ...facts.map(({ label, value }) => `${label} : ${value}`),
    "",
    input.message,
    "",
    anonymous,
    ...(input.adminUrl ? [`Admin : ${input.adminUrl}`] : []),
    "",
    EMAIL_SITE,
  ].join("\n");

  return { subject, html, text };
}

/** Grille du jour ou du lendemain absente : à planifier depuis `/admin`. */
export function buildMissingGridEmail({
  which,
  dateLabel,
  adminUrl,
}: {
  which: "today" | "tomorrow";
  dateLabel: string;
  adminUrl: string | null;
}): AlertEmail {
  const day = which === "today" ? "du jour" : "de demain";
  const subject = `Grille ${day} absente (${dateLabel})`;
  const lead = `La grille ${day}, le ${dateLabel}, n'existe pas. Les joueurs trouveront un écran vide.`;
  const action =
    which === "tomorrow"
      ? `Dans l'admin, « Planifier maintenant » la crée.`
      : `Dans l'admin, regarde le pool et la planification.`;

  const html = renderEmailLayout({
    lang: "fr",
    title: subject,
    body: `<p style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:24px;color:${EMAIL_COLORS.text};">${escapeHtml(subject)}</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.5;">${escapeHtml(lead)}</p>
<p style="margin:0 0 ${adminUrl ? "8px" : "32px"};font-size:16px;line-height:1.5;">${escapeHtml(action)}</p>
${adminUrl ? `<p style="margin:0 0 32px;font-size:14px;"><a href="${escapeHtml(adminUrl)}" style="color:${EMAIL_COLORS.text};">Ouvrir l'admin</a></p>` : ""}`,
  });
  const text = [
    subject,
    "",
    lead,
    action,
    ...(adminUrl ? ["", `Admin : ${adminUrl}`] : []),
    "",
    EMAIL_SITE,
  ].join("\n");
  return { subject, html, text };
}
