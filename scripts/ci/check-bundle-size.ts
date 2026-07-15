import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { gzipSync } from "node:zlib";

const ASSETS_DIRECTORY = "dist/assets";
const MODULE_MANIFEST = "dist/.bundle-modules.json";
// Baseline 2026-07-15 : jeu, résultat et pages éditoriales eager ; admin lazy.
// React Router rend les navigations publiques instantanées, au prix assumé d'un
// entry plus gros. Les chunks non initiaux gardent leur budget anti-monolithe.
const MAX_NON_INITIAL_CHUNK_GZIP_BYTES = 150 * 1024;
const MAX_PLAYER_INITIAL_GZIP_BYTES = 250 * 1024;

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

const dynamicEntries = moduleChunks.filter((chunk) => chunk.isDynamicEntry);
const adminEntry = dynamicEntries.find((chunk) =>
  chunk.modules.some((moduleId) =>
    moduleId.endsWith("/src/features/admin/AdminPage.tsx"),
  ),
);
if (!adminEntry || dynamicEntries.length !== 1) {
  throw new Error(
    "L'admin doit être l'unique entrée dynamique du bundle JavaScript",
  );
}
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
