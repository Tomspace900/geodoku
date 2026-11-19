// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANNOUNCEMENT_WINDOW_DAYS,
  CHANGELOG_ENTRIES,
  compareSemver,
  formatChangelogDate,
  formatChangelogMonth,
  getPendingAnnouncement,
  LATEST_CHANGELOG_VERSION,
  parseSemver,
} from "../changelog";

// Les majeures d'avant le versionnage (1.0.0, 2.0.0) n'ont jamais eu de spotlight.
const SPOTLIGHT_REQUIRED_SINCE = "3.0.0";

const ROOT = join(import.meta.dirname, "../../../../..");
const PACKAGE_VERSION = (
  JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
    version: string;
  }
).version;

const DAY_MS = 24 * 60 * 60 * 1000;
const STATS_ENTRY = CHANGELOG_ENTRIES.find((entry) => entry.id === "stats");
const STATS_RELEASE_MS = Date.parse(`${STATS_ENTRY?.dateYmd}T00:00:00.000Z`);
const atOffset = (offsetMs: number) => new Date(STATS_RELEASE_MS + offsetMs);

describe("CHANGELOG_ENTRIES", () => {
  it("contient uniquement des versions SemVer X.Y.0 (aucun correctif)", () => {
    CHANGELOG_ENTRIES.forEach((entry) => {
      const parsed = parseSemver(entry.version);
      expect(parsed).not.toBeNull();
      expect(parsed?.[2]).toBe(0);
    });
  });

  it("est strictement trié par version décroissante sans doublon", () => {
    const ids = new Set<string>();
    const versions = new Set<string>();
    CHANGELOG_ENTRIES.forEach((entry, index) => {
      expect(ids.has(entry.id)).toBe(false);
      expect(versions.has(entry.version)).toBe(false);
      ids.add(entry.id);
      versions.add(entry.version);
      if (index > 0) {
        const previous = CHANGELOG_ENTRIES[index - 1];
        expect(compareSemver(previous.version, entry.version)).toBeGreaterThan(
          0,
        );
      }
    });
  });

  it("donne un sous-titre éditorial (milestone) à chaque version majeure", () => {
    CHANGELOG_ENTRIES.filter((entry) => entry.kind === "major").forEach(
      (entry) => {
        expect(entry.milestone).toBeTruthy();
        expect(parseSemver(entry.version)?.[1]).toBe(0);
      },
    );
  });

  it(`donne un spotlight à chaque version majeure depuis ${SPOTLIGHT_REQUIRED_SINCE}`, () => {
    CHANGELOG_ENTRIES.filter(
      (entry) =>
        entry.kind === "major" &&
        compareSemver(entry.version, SPOTLIGHT_REQUIRED_SINCE) >= 0,
    ).forEach((entry) => {
      expect(entry.announcement?.kind).toBe("spotlight");
    });
  });

  it("reste aligné avec package.json sur MAJOR.MINOR (les patches passent sans entrée)", () => {
    const pkg = parseSemver(PACKAGE_VERSION);
    const latest = parseSemver(LATEST_CHANGELOG_VERSION);
    expect(pkg).not.toBeNull();
    expect(latest).not.toBeNull();
    expect(pkg?.[0]).toBe(latest?.[0]);
    expect(pkg?.[1]).toBe(latest?.[1]);
    expect(
      compareSemver(PACKAGE_VERSION, LATEST_CHANGELOG_VERSION),
    ).toBeGreaterThanOrEqual(0);
  });
});

describe("getPendingAnnouncement", () => {
  it("remonte le spotlight actif dans la fenêtre de 21 jours même si une mineure plus récente existe", () => {
    const pending = getPendingAnnouncement({
      seenVersion: null,
      now: atOffset(5 * DAY_MS),
    });
    expect(pending?.id).toBe("stats");
    expect(pending?.version).toBe("3.0.0");
  });

  it("disparaît une fois la fenêtre de 21 jours écoulée", () => {
    expect(
      getPendingAnnouncement({
        seenVersion: null,
        now: atOffset(ANNOUNCEMENT_WINDOW_DAYS * DAY_MS),
      }),
    ).toBeNull();
  });

  it("ne réapparaît plus quand seenVersion atteint ou dépasse la version annoncée", () => {
    expect(
      getPendingAnnouncement({
        seenVersion: "3.0.0",
        now: atOffset(DAY_MS),
      }),
    ).toBeNull();
    expect(
      getPendingAnnouncement({
        seenVersion: "3.1.0",
        now: atOffset(DAY_MS),
      }),
    ).toBeNull();
  });

  it("s'affiche si seenVersion correspond à une version antérieure", () => {
    const pending = getPendingAnnouncement({
      seenVersion: "2.0.0",
      now: atOffset(DAY_MS),
    });
    expect(pending?.version).toBe("3.0.0");
  });
});

describe("dates du changelog", () => {
  it("formate la date d'une entrée dans chaque langue, sans décalage horaire", () => {
    expect(formatChangelogDate("2026-11-17", "fr")).toBe("17 novembre 2026");
    expect(formatChangelogDate("2026-11-17", "en")).toBe("November 17, 2026");
  });

  it("formate le mois de l'en-tête avec une capitale", () => {
    expect(formatChangelogMonth("2026-11-01", "fr")).toBe("Novembre 2026");
    expect(formatChangelogMonth("2026-11-01", "en")).toBe("November 2026");
  });
});
