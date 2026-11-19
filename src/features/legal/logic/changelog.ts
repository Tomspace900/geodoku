import type { Locale, TKey } from "@/i18n/types";

export type ChangelogKind = "major" | "minor";

export type ChangelogSpotlightTarget = "stats";

export type ChangelogAnnouncement = {
  kind: "spotlight";
  target: ChangelogSpotlightTarget;
  text: TKey;
  ctaLabel: TKey;
  ctaPath: string;
  /**
   * Second bouton qui ouvre la création de compte sur « Mes stats ». Une annonce
   * qui le porte ne s'affiche qu'aux joueurs sans compte.
   */
  accountCtaLabel?: TKey;
};

export type ChangelogEntry = {
  id: string;
  /** SemVer X.Y.0 : les correctifs (patch) ne figurent pas dans /changelog. */
  version: string;
  kind: ChangelogKind;
  /** Date de mise en prod UTC au format YYYY-MM-DD, d'où dérivent la date affichée et le mois de l'en-tête. */
  dateYmd: string;
  title: TKey;
  body: TKey;
  /** Sous-titre éditorial affiché à droite des versions majeures. */
  milestone?: TKey;
  /** Annonce discrète en jeu (spotlight) pour les nouveautés marquantes. */
  announcement?: ChangelogAnnouncement;
};

/**
 * Étapes marquantes côté joueur, de la plus récente à la plus ancienne.
 * Les versions majeures (X.0.0) et mineures (X.Y.0) y vivent ; les correctifs
 * (X.Y.Z avec Z > 0) n'incrémentent que `package.json` et le tag git.
 */
export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    id: "report",
    version: "3.1.0",
    kind: "minor",
    dateYmd: "2026-11-17",
    title: "changelog.entries.reportTitle",
    body: "changelog.entries.reportBody",
  },
  {
    id: "stats",
    version: "3.0.0",
    kind: "major",
    dateYmd: "2026-11-14",
    title: "changelog.entries.statsTitle",
    body: "changelog.entries.statsBody",
    milestone: "changelog.milestones.stats",
    announcement: {
      kind: "spotlight",
      target: "stats",
      text: "changelog.spotlight.statsText",
      ctaLabel: "changelog.spotlight.statsCta",
      ctaPath: "/stats",
      accountCtaLabel: "changelog.spotlight.accountCta",
    },
  },
  {
    id: "others",
    version: "2.5.0",
    kind: "minor",
    dateYmd: "2026-11-05",
    title: "changelog.entries.othersTitle",
    body: "changelog.entries.othersBody",
  },
  {
    id: "stability",
    version: "2.4.0",
    kind: "minor",
    dateYmd: "2026-10-22",
    title: "changelog.entries.stabilityTitle",
    body: "changelog.entries.stabilityBody",
  },
  {
    id: "answerSources",
    version: "2.3.0",
    kind: "minor",
    dateYmd: "2026-10-15",
    title: "changelog.entries.answerSourcesTitle",
    body: "changelog.entries.answerSourcesBody",
  },
  {
    id: "newConstraints",
    version: "2.2.0",
    kind: "minor",
    dateYmd: "2026-09-16",
    title: "changelog.entries.newConstraintsTitle",
    body: "changelog.entries.newConstraintsBody",
  },
  {
    id: "archive",
    version: "2.1.0",
    kind: "minor",
    dateYmd: "2026-08-09",
    title: "changelog.entries.archiveTitle",
    body: "changelog.entries.archiveBody",
  },
  {
    id: "scoreClarity",
    version: "2.0.0",
    kind: "major",
    dateYmd: "2026-07-13",
    title: "changelog.entries.scoreClarityTitle",
    body: "changelog.entries.scoreClarityBody",
    milestone: "changelog.milestones.scoreClarity",
  },
  {
    id: "countryDataRefresh",
    version: "1.8.0",
    kind: "minor",
    dateYmd: "2026-06-25",
    title: "changelog.entries.countryDataRefreshTitle",
    body: "changelog.entries.countryDataRefreshBody",
  },
  {
    id: "constraintsRefresh",
    version: "1.7.0",
    kind: "minor",
    dateYmd: "2026-06-12",
    title: "changelog.entries.constraintsRefreshTitle",
    body: "changelog.entries.constraintsRefreshBody",
  },
  {
    id: "scoringV2",
    version: "1.6.0",
    kind: "minor",
    dateYmd: "2026-06-06",
    title: "changelog.entries.scoringV2Title",
    body: "changelog.entries.scoringV2Body",
  },
  {
    id: "reliability",
    version: "1.5.0",
    kind: "minor",
    dateYmd: "2026-06-02",
    title: "changelog.entries.reliabilityTitle",
    body: "changelog.entries.reliabilityBody",
  },
  {
    id: "darkMode",
    version: "1.4.0",
    kind: "minor",
    dateYmd: "2026-05-29",
    title: "changelog.entries.darkModeTitle",
    body: "changelog.entries.darkModeBody",
  },
  {
    id: "identity",
    version: "1.3.0",
    kind: "minor",
    dateYmd: "2026-05-26",
    title: "changelog.entries.identityTitle",
    body: "changelog.entries.identityBody",
  },
  {
    id: "comfort",
    version: "1.2.0",
    kind: "minor",
    dateYmd: "2026-05-25",
    title: "changelog.entries.comfortTitle",
    body: "changelog.entries.comfortBody",
  },
  {
    id: "help",
    version: "1.1.0",
    kind: "minor",
    dateYmd: "2026-05-22",
    title: "changelog.entries.helpTitle",
    body: "changelog.entries.helpBody",
  },
  {
    id: "footer",
    version: "1.0.0",
    kind: "major",
    dateYmd: "2026-04-30",
    title: "changelog.entries.footerTitle",
    body: "changelog.entries.footerBody",
    milestone: "changelog.milestones.launch",
  },
  {
    id: "scoring",
    version: "0.4.0",
    kind: "minor",
    dateYmd: "2026-04-29",
    title: "changelog.entries.scoringTitle",
    body: "changelog.entries.scoringBody",
  },
  {
    id: "solution",
    version: "0.3.0",
    kind: "minor",
    dateYmd: "2026-04-17",
    title: "changelog.entries.solutionTitle",
    body: "changelog.entries.solutionBody",
  },
  {
    id: "bilingual",
    version: "0.2.0",
    kind: "minor",
    dateYmd: "2026-04-15",
    title: "changelog.entries.bilingualTitle",
    body: "changelog.entries.bilingualBody",
  },
  {
    id: "launch",
    version: "0.1.0",
    kind: "minor",
    dateYmd: "2026-04-10",
    title: "changelog.entries.launchTitle",
    body: "changelog.entries.launchBody",
  },
];

export const LATEST_CHANGELOG_VERSION = CHANGELOG_ENTRIES[0].version;
export const LATEST_CHANGELOG_UPDATE_DATE = CHANGELOG_ENTRIES[0].dateYmd;

export const ANNOUNCEMENT_WINDOW_DAYS = 21;
const DAY_MS = 24 * 60 * 60 * 1000;
const SEMVER_RE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function parseSemver(version: string): [number, number, number] | null {
  const match = SEMVER_RE.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function compareSemver(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return a.localeCompare(b);
  if (pa[0] !== pb[0]) return pa[0] - pb[0];
  if (pa[1] !== pb[1]) return pa[1] - pb[1];
  return pa[2] - pb[2];
}

function startOfUtcDay(ymd: string): number {
  const [year, month, day] = ymd.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function formatUtcDay(
  ymd: string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
    ...options,
    timeZone: "UTC",
  }).format(startOfUtcDay(ymd));
}

/** « 17 novembre 2026 » / « November 17, 2026 » : la date d'une entrée, dérivée de `dateYmd`. */
export function formatChangelogDate(ymd: string, locale: Locale): string {
  return formatUtcDay(ymd, locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** « Novembre 2026 » / « November 2026 » : le mois de la dernière entrée, en tête de page. */
export function formatChangelogMonth(ymd: string, locale: Locale): string {
  const month = formatUtcDay(ymd, locale, { month: "long", year: "numeric" });
  return month.charAt(0).toUpperCase() + month.slice(1);
}

/**
 * Retourne la plus récente entrée portant une annonce en jeu encore active
 * (dans la fenêtre de 21 jours) et non vue par ce joueur. Un nouveau joueur la
 * voit aussi, après « Comment jouer ».
 */
export function getPendingAnnouncement({
  entries = CHANGELOG_ENTRIES,
  seenVersion,
  now = new Date(),
}: {
  entries?: readonly ChangelogEntry[];
  seenVersion: string | null;
  now?: Date;
}): ChangelogEntry | null {
  const nowMs = now.getTime();
  const windowMs = ANNOUNCEMENT_WINDOW_DAYS * DAY_MS;

  const candidate = entries.find((entry) => {
    if (!entry.announcement) return false;
    const releaseMs = startOfUtcDay(entry.dateYmd);
    return nowMs >= releaseMs && nowMs < releaseMs + windowMs;
  });

  if (!candidate) return null;
  if (
    seenVersion !== null &&
    compareSemver(seenVersion, candidate.version) >= 0
  ) {
    return null;
  }
  return candidate;
}
