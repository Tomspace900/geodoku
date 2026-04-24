/**
 * Fetches only cca3 + flags from REST Countries, compares parseFlagFromAlt(alt)
 * to the built countries.json and reports gaps.
 *
 * Run: pnpm audit:flag-colors
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Country, FlagColor } from "../../src/features/countries/types.ts";
import { type Patches, parseFlagFromAlt } from "./buildCountriesLib.ts";

const REST = "https://restcountries.com/v3.1/all?fields=cca3,flags";

type RcRow = { cca3?: string | string[]; flags?: { alt?: string } };

function sortColors(c: readonly FlagColor[]): FlagColor[] {
  return [...c].sort();
}

function inANotB(
  a: readonly FlagColor[],
  b: readonly FlagColor[],
): FlagColor[] {
  const sb = new Set(b);
  return a.filter((x) => !sb.has(x));
}

function rcMapByCca3(rows: RcRow[]): Map<string, string | undefined> {
  const m = new Map<string, string | undefined>();
  for (const row of rows) {
    const raw = row.cca3;
    if (raw == null) continue;
    const codes = Array.isArray(raw) ? raw : [raw];
    for (const c of codes) {
      if (typeof c === "string" && /^[A-Z]{3}$/.test(c)) {
        m.set(c, row.flags?.alt);
      }
    }
  }
  return m;
}

void (async () => {
  const root = dirname(fileURLToPath(import.meta.url));
  const countriesPath = join(
    root,
    "../../src/features/countries/data/countries.json",
  );
  const countries: Country[] = JSON.parse(
    readFileSync(countriesPath, "utf-8"),
  ) as Country[];
  const patches = JSON.parse(
    readFileSync(join(root, "patches.json"), "utf-8"),
  ) as Patches;
  const flagColorOverrides = new Set(
    Object.keys(patches.overrides).filter(
      (k) => patches.overrides[k]?.flagColors != null,
    ),
  );

  console.log("Fetching", REST, "…");
  const res = await fetch(REST);
  if (!res.ok) throw new Error(String(res.status));
  const rows = (await res.json()) as RcRow[];
  const alts = rcMapByCca3(rows);

  const restButNotInJson: {
    code: string;
    name: string;
    fromRest: FlagColor[];
    inJson: FlagColor[];
  }[] = [];
  const jsonButNotInRest: {
    code: string;
    name: string;
    fromRest: FlagColor[];
    inJson: FlagColor[];
    alt: string;
  }[] = [];
  const emptyAlt: { code: string; name: string; inJson: FlagColor[] }[] = [];
  const noAlt: { code: string; name: string; inJson: FlagColor[] }[] = [];
  const restMore_patched: typeof restButNotInJson = [];
  const jsonMore_patched: typeof jsonButNotInRest = [];

  for (const c of countries) {
    const alt = alts.get(c.code);
    const parsed = parseFlagFromAlt(alt);
    const fromRest = sortColors(parsed.flagColors);
    const inJson = sortColors(c.flagColors);
    if (alt === undefined) {
      noAlt.push({ code: c.code, name: c.names.en, inJson });
      continue;
    }
    if (!alt.trim()) {
      emptyAlt.push({ code: c.code, name: c.names.en, inJson });
    }

    const moreInRest = inANotB(fromRest, inJson);
    const moreInJson = inANotB(inJson, fromRest);
    const isFlagPatch = flagColorOverrides.has(c.code);
    if (moreInRest.length) {
      const row = {
        code: c.code,
        name: c.names.en,
        fromRest: moreInRest,
        inJson: c.flagColors,
      };
      if (isFlagPatch) restMore_patched.push(row);
      else restButNotInJson.push(row);
    }
    if (moreInJson.length) {
      const row = {
        code: c.code,
        name: c.names.en,
        fromRest,
        inJson: moreInJson,
        alt: alt.length > 140 ? `${alt.slice(0, 140)}…` : alt,
      };
      if (isFlagPatch) jsonMore_patched.push(row);
      else jsonButNotInRest.push(row);
    }
  }

  console.log(
    "\n── parse(REST alt) > JSON : pays sans override flagColors (anormal) ──\n",
  );
  for (const x of restButNotInJson) {
    console.log(
      `  ${x.code}  ${x.name}\n     +${JSON.stringify(x.fromRest)}  (JSON: ${JSON.stringify(x.inJson)})`,
    );
  }
  if (restButNotInJson.length === 0) {
    console.log("  (aucun)\n");
  }
  if (restMore_patched.length) {
    console.log(
      "\n── (ignoré) parse > JSON mais `overrides[…].flagColors` dans patches.json ──\n",
    );
    for (const x of restMore_patched) {
      console.log(
        `  ${x.code}  ${x.name}  +${JSON.stringify(x.fromRest)}  → JSON: ${JSON.stringify(x.inJson)}`,
      );
    }
  }

  console.log(
    "\n── JSON > parse : vrais trous (pas d’override flagColors, alt incomplet) ──\n",
  );
  for (const x of jsonButNotInRest) {
    console.log(
      `  ${x.code}  ${x.name}\n     manquantes: ${JSON.stringify(x.inJson)}  |  parse: ${JSON.stringify(x.fromRest)}\n     alt: ${x.alt || "(vide)"}\n`,
    );
  }
  if (jsonButNotInRest.length === 0) {
    console.log("  (aucun)\n");
  }
  if (jsonMore_patched.length) {
    console.log(
      "\n── (attendu) JSON > parse avec override flagColors (jeu / politique) ──\n",
    );
    for (const x of jsonMore_patched) {
      console.log(
        `  ${x.code}  ${x.name}  +JSON: ${JSON.stringify(x.inJson)}  |  parse: ${JSON.stringify(x.fromRest)}`,
      );
    }
  }

  if (noAlt.length) {
    console.log(
      "\n── Pas d’entrée alt REST pour le code (cca3 absent de la réponse) ──\n",
    );
    for (const x of noAlt) {
      console.log(
        `  ${x.code}  ${x.name}  flagColors: ${JSON.stringify(x.inJson)}`,
      );
    }
  }
  if (emptyAlt.length) {
    console.log("\n── alt texte vide ──\n");
    for (const x of emptyAlt) {
      console.log(
        `  ${x.code}  ${x.name}  flagColors: ${JSON.stringify(x.inJson)}`,
      );
    }
  }

  console.log(
    `\n── Résumé (hors blocs ‘ignoré / attendu’ ci-dessus) ──\n  Trous: JSON > parse, sans override → ${jsonButNotInRest.length}\n  Anomalies: parse > JSON, sans override → ${restButNotInJson.length}`,
  );
})().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
