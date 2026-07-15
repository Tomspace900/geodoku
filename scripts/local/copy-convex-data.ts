import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  buildCopyCommands,
  parseCopyMode,
  requirePersonalDevDeployment,
} from "./convex-data-operations";

function runConvex(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["exec", "convex", ...args], {
      stdio: "inherit",
      shell: false,
    });
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `Convex CLI a échoué (${signal ? `signal ${signal}` : `code ${code ?? "inconnu"}`})`,
          ),
        );
      }
    });
  });
}

async function confirmProductionToDevelop(): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error(
      "La copie prod → develop exige un terminal interactif et une confirmation.",
    );
  }
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  try {
    const answer = await prompt.question(
      "Cette opération REMPLACE toutes les données de preview/develop. Taper `develop` pour confirmer : ",
    );
    if (answer.trim() !== "develop") {
      throw new Error("Confirmation incorrecte, copie annulée.");
    }
  } finally {
    prompt.close();
  }
}

async function main(): Promise<void> {
  const mode = parseCopyMode(process.argv.slice(2));
  const tempDirectory = await mkdtemp(join(tmpdir(), "geodoku-convex-"));
  const archivePath = join(tempDirectory, "dump.zip");
  const commands = buildCopyCommands(mode, archivePath);

  try {
    if (commands.requiresPersonalDevTarget) {
      const deployment = requirePersonalDevDeployment(
        process.env.CONVEX_DEPLOYMENT,
      );
      console.log(`Cible d'import vérifiée : ${deployment}`);
    }
    if (commands.requiresDevelopConfirmation) {
      await confirmProductionToDevelop();
    }

    console.log(`Copie Convex : ${mode}`);
    await runConvex(commands.exportArgs);
    await runConvex(commands.importArgs);
    console.log("Copie Convex terminée.");
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
