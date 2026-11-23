export type CopyMode = "prod-to-dev" | "develop-to-dev" | "prod-to-develop";

export type CopyCommands = {
  exportArgs: string[];
  importArgs: string[];
  clearSigningKeysArgs: string[];
  requiresDevelopConfirmation: boolean;
  requiresPersonalDevTarget: boolean;
};

export function parseCopyMode(argv: string[]): CopyMode {
  if (argv.length !== 1) {
    throw new Error(
      "Usage : copy-convex-data.ts prod-to-dev|develop-to-dev|prod-to-develop",
    );
  }
  const [mode] = argv;
  if (
    mode !== "prod-to-dev" &&
    mode !== "develop-to-dev" &&
    mode !== "prod-to-develop"
  ) {
    throw new Error(`Mode de copie inconnu : ${mode}`);
  }
  return mode;
}

/**
 * Les clés JWKS de Better Auth sont chiffrées avec le `BETTER_AUTH_SECRET` du
 * déploiement qui les a créées : copiées ailleurs, elles ne se déchiffrent plus
 * et toute connexion échoue (« Failed to decrypt private key »). On vide donc
 * la table après l'import, et Better Auth en recrée une avec le secret de la
 * cible à la première requête. Les jetons qu'elle signait expirent en 15 min.
 */
export function buildCopyCommands(
  mode: CopyMode,
  archivePath: string,
  emptyFilePath: string,
): CopyCommands {
  const sourceArgs =
    mode === "develop-to-dev"
      ? ["export", "--preview-name", "develop"]
      : ["export", "--prod"];
  const targetArgs =
    mode === "prod-to-develop"
      ? ["import", "--preview-name", "develop"]
      : ["import"];

  return {
    exportArgs: [...sourceArgs, "--path", archivePath],
    importArgs: [...targetArgs, "--replace-all", "-y", archivePath],
    clearSigningKeysArgs: [
      ...targetArgs,
      "--component",
      "betterAuth",
      "--table",
      "jwks",
      "--replace",
      "-y",
      emptyFilePath,
    ],
    requiresDevelopConfirmation: mode === "prod-to-develop",
    requiresPersonalDevTarget: mode !== "prod-to-develop",
  };
}

/** Les imports sans cible CLI explicite doivent viser uniquement le cloud dev personnel. */
export function requirePersonalDevDeployment(
  deployment: string | undefined,
): string {
  const normalized = deployment?.trim();
  if (!normalized?.startsWith("dev:")) {
    throw new Error(
      "Opération refusée : CONVEX_DEPLOYMENT doit identifier un cloud dev personnel (`dev:*`).",
    );
  }
  return normalized;
}
