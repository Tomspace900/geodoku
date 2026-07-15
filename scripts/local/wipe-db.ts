import { spawn } from "node:child_process";
import { requirePersonalDevDeployment } from "./convex-data-operations";

const WIPE_CONFIRMATION = "WIPE_DEV_DATA";

function runWipe(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      [
        "exec",
        "convex",
        "run",
        "wipe:wipeAllData",
        JSON.stringify({ confirmation: WIPE_CONFIRMATION }),
      ],
      { stdio: "inherit", shell: false },
    );
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (code === 0) resolve();
      else {
        reject(
          new Error(
            `Wipe Convex échoué (${signal ? `signal ${signal}` : `code ${code ?? "inconnu"}`})`,
          ),
        );
      }
    });
  });
}

async function main(): Promise<void> {
  const deployment = requirePersonalDevDeployment(
    process.env.CONVEX_DEPLOYMENT,
  );
  console.log(`Wipe autorisé sur le cloud dev personnel : ${deployment}`);
  await runWipe();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
