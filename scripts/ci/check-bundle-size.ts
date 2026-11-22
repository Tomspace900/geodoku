import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";

const ASSETS_DIRECTORY = "dist/assets";
const MODULE_MANIFEST = "dist/.bundle-modules.json";
// Baseline 2026-07-15 : jeu, résultat et pages éditoriales eager ; admin lazy.
// Depuis le 2026-08-09, l'archive et l'entraînement sont lazy eux aussi (cf.
// `LAZY_ROUTE_MODULES`). React Router rend les navigations publiques
// instantanées, au prix assumé d'un entry plus gros. Depuis le 2026-09-16
// (P4 lot 2), le chunk des faits (`LAZY_FEATURE_MODULES`) suit le même
// principe : hors chemin critique, chargé à la demande. Les chunks non
// initiaux gardent leur budget anti-monolithe.
const MAX_NON_INITIAL_CHUNK_GZIP_BYTES = 150 * 1024;
// Budget du chargement joueur initial : ce qu'il faut pour afficher et jouer
// la grille du jour, avant tout chunk à la demande. 250 KiB en juillet 2026,
// relevé à chaque gros ajout (posthog-js, client Better Auth) jusqu'à 300.
// Porté à 400 KiB le 2026-11-16, sur décision du user, pour laisser de la marge
// aux fonctionnalités. Pourquoi 400 et pas plus : deux joueurs sur trois sont
// sur téléphone, et chaque 100 KiB gzip coûte à un Android moyen ~0,1 à 0,15 s
// de téléchargement en 4G plus ~0,15 à 0,3 s d'analyse du JS. À 400, les Web
// Vitals Android (PostHog) restent sous le seuil « bon » de Google (LCP ≤ 2,5 s
// au 75e percentile) ; vers 500 ils l'atteignent, et le joueur qui arrive par un
// lien partagé, sans rien en cache, le sent.
// Le garde-fou reste **bloquant** : il sert surtout à attraper une dérive
// involontaire (le 2026-11-16, posthog-js +44 KiB et une copie de Radix en
// double). Une nouvelle page se charge à la demande (`LAZY_ROUTE_MODULES`).
// Resserré à 300 KiB le 2026-11-23 (#180) : posthog-js chargé après le rendu,
// le chunk initial est passé de 293 à 217 KiB ; la marge reste de ~80 KiB.
const MAX_PLAYER_INITIAL_GZIP_BYTES = 300 * 1024;

const chunks = readdirSync(ASSETS_DIRECTORY)
  .filter((file) => file.endsWith(".js"))
  .map((file) => {
    const path = join(ASSETS_DIRECTORY, file);
    return {
      path,
      gzipBytes: gzipSync(readFileSync(path)).byteLength,
    };
  })
  .sort((a, b) => b.gzipBytes - a.gzipBytes);

if (chunks.length === 0) {
  throw new Error(`Aucun chunk JavaScript trouvé dans ${ASSETS_DIRECTORY}`);
}

console.log("Chunks JavaScript (gzip) :");
chunks.forEach(({ path, gzipBytes }) => {
  console.log(`  ${basename(path)} : ${(gzipBytes / 1024).toFixed(1)} KiB`);
});

type ModuleChunk = {
  fileName: string;
  isEntry: boolean;
  isDynamicEntry: boolean;
  imports: string[];
  modules: string[];
};

const moduleChunks = JSON.parse(
  readFileSync(MODULE_MANIFEST, "utf8"),
) as ModuleChunk[];
const gzipByFileName = new Map(
  chunks.map(({ path, gzipBytes }) => [`assets/${basename(path)}`, gzipBytes]),
);
const byFileName = new Map(
  moduleChunks.map((chunk) => [chunk.fileName, chunk]),
);
const playerEntry = moduleChunks.find((chunk) => chunk.isEntry);
if (!playerEntry) throw new Error("Chunk joueur initial introuvable");

function collectStaticGraph(entryFileName: string): Set<string> {
  const files = new Set<string>();
  function collect(fileName: string): void {
    if (files.has(fileName)) return;
    files.add(fileName);
    byFileName.get(fileName)?.imports.forEach(collect);
  }
  collect(entryFileName);
  return files;
}

const initialFiles = collectStaticGraph(playerEntry.fileName);
const playerInitialGzipBytes = [...initialFiles].reduce(
  (total, fileName) => total + (gzipByFileName.get(fileName) ?? 0),
  0,
);
console.log(
  `Chargement joueur initial : ${(playerInitialGzipBytes / 1024).toFixed(1)} KiB gzip`,
);
if (playerInitialGzipBytes > MAX_PLAYER_INITIAL_GZIP_BYTES) {
  throw new Error(
    `Budget joueur dépassé (${MAX_PLAYER_INITIAL_GZIP_BYTES / 1024} KiB gzip)`,
  );
}

const oversizedNonInitial = chunks.filter(({ path, gzipBytes }) => {
  const fileName = `assets/${basename(path)}`;
  return (
    !initialFiles.has(fileName) && gzipBytes > MAX_NON_INITIAL_CHUNK_GZIP_BYTES
  );
});
if (oversizedNonInitial.length > 0) {
  const names = oversizedNonInitial
    .map(({ path }) => basename(path))
    .join(", ");
  throw new Error(
    `Budget dépassé (${MAX_NON_INITIAL_CHUNK_GZIP_BYTES / 1024} KiB gzip par chunk non initial) : ${names}`,
  );
}

// Routes volontairement chargées en lazy : l'admin (hors parcours joueur), plus
// l'archive et l'entraînement (inatteignables tant que la grille du jour n'est
// pas terminée), et « Mes stats » avec les écrans du compte (#155), qu'on
// ouvre depuis l'en-tête. Les sortir du chemin critique ne coûte donc rien au
// quotidien.
const LAZY_ROUTE_MODULES = [
  "/src/features/admin/AdminPage.tsx",
  "/src/features/archive/ArchivePage.tsx",
  "/src/features/archive/TrainingPage.tsx",
  "/src/features/stats/StatsPage.tsx",
];

// Entrées dynamiques hors routes : le chunk des faits (P4 lot 2), seul
// module qui importe `content/countries/facts` — cf. `countrySheetData.ts`.
// Chargé via `import()` depuis `loadCountrySheetData.ts`, préchargé au montage
// de la grille solution, jamais importé statiquement par `src/`. Et posthog-js
// (#180), chargé par `startAnalytics` après l'événement `load`.
const LAZY_FEATURE_MODULES = [
  "/src/features/countries/logic/countrySheetData.ts",
  "/src/app/posthogClient.ts",
];

// Les deux listes sont **exhaustives** dans les deux sens : une entrée lazy
// retirée comme une entrée ajoutée par inadvertance fait échouer la vérification.
const EXPECTED_DYNAMIC_MODULES = [
  ...LAZY_ROUTE_MODULES,
  ...LAZY_FEATURE_MODULES,
];

const dynamicEntries = moduleChunks.filter((chunk) => chunk.isDynamicEntry);
const dynamicEntryByModule = new Map(
  EXPECTED_DYNAMIC_MODULES.map((moduleSuffix) => [
    moduleSuffix,
    dynamicEntries.find((chunk) =>
      chunk.modules.some((moduleId) => moduleId.endsWith(moduleSuffix)),
    ),
  ]),
);

const missingLazyModules = EXPECTED_DYNAMIC_MODULES.filter(
  (moduleSuffix) => !dynamicEntryByModule.get(moduleSuffix),
);
if (missingLazyModules.length > 0) {
  throw new Error(
    `Ces modules doivent rester en chargement lazy : ${missingLazyModules.join(", ")}`,
  );
}
if (dynamicEntries.length !== EXPECTED_DYNAMIC_MODULES.length) {
  throw new Error(
    `Entrée dynamique inattendue : le bundle doit en compter exactement ${EXPECTED_DYNAMIC_MODULES.length}, trouvé ${dynamicEntries
      .map((chunk) => chunk.fileName)
      .join(", ")}`,
  );
}

// `content/countries/facts` (le snapshot de faits pays, ~197 pays) ne doit
// jamais rentrer dans le graphe initial : seul le chunk des faits l'importe.
const countrySheetDataEntry = dynamicEntryByModule.get(
  "/src/features/countries/logic/countrySheetData.ts",
);
if (!countrySheetDataEntry) throw new Error("Chunk des faits introuvable");
const factsOwner = moduleChunks.find((chunk) =>
  chunk.modules.some((moduleId) =>
    moduleId.endsWith("/content/countries/facts.ts"),
  ),
);
if (!factsOwner || initialFiles.has(factsOwner.fileName)) {
  throw new Error(
    "content/countries/facts.ts doit rester hors du chargement initial (chunk des faits uniquement)",
  );
}

// posthog-js pèse plus que react-dom : il ne doit jamais revenir dans le
// graphe initial, ni par un import statique oublié (#180).
const posthogInInitial = moduleChunks.filter(
  (chunk) =>
    initialFiles.has(chunk.fileName) &&
    chunk.modules.some((moduleId) =>
      moduleId.includes("/node_modules/posthog-js/"),
    ),
);
if (posthogInInitial.length > 0) {
  throw new Error(
    `posthog-js doit rester hors du chargement initial : ${posthogInInitial
      .map((chunk) => chunk.fileName)
      .join(", ")}`,
  );
}

const adminEntry = dynamicEntryByModule.get(
  "/src/features/admin/AdminPage.tsx",
);
if (!adminEntry) throw new Error("Chunk admin introuvable");
const adminFiles = collectStaticGraph(adminEntry.fileName);

const eagerModules = [
  "/src/features/game/components/ResultScreen.tsx",
  "/src/features/legal/PrivacyPage.tsx",
  "/src/features/legal/ChangelogPage.tsx",
];
eagerModules.forEach((moduleSuffix) => {
  const owner = moduleChunks.find((chunk) =>
    chunk.modules.some((moduleId) => moduleId.endsWith(moduleSuffix)),
  );
  if (!owner || !initialFiles.has(owner.fileName)) {
    throw new Error(
      `${moduleSuffix} doit rester dans le chargement joueur initial`,
    );
  }
});

const requiredAdminPackages = ["react-day-picker", "date-fns"];
const guardedAdminPackages = [...requiredAdminPackages, "@date-fns/tz"];
const ownersByPackage = new Map(
  guardedAdminPackages.map((packageName) => [
    packageName,
    moduleChunks.filter((chunk) =>
      chunk.modules.some((moduleId) =>
        moduleId.includes(`/node_modules/${packageName}/`),
      ),
    ),
  ]),
);

requiredAdminPackages.forEach((packageName) => {
  if (ownersByPackage.get(packageName)?.length === 0) {
    throw new Error(`${packageName} est introuvable dans le bundle admin`);
  }
});

ownersByPackage.forEach((owners, packageName) => {
  const outsideAdmin = owners.filter(
    (owner) =>
      initialFiles.has(owner.fileName) || !adminFiles.has(owner.fileName),
  );
  if (outsideAdmin.length > 0) {
    throw new Error(
      `${packageName} doit rester exclusivement dans le graphe admin : ${outsideAdmin
        .map((owner) => owner.fileName)
        .join(", ")}`,
    );
  }
});
