type SnapshotModuleOptions = Readonly<{
  typeName: string;
  typeImportPath: string;
  exportName: string;
}>;

/**
 * Sérialise un snapshot versionné en module TypeScript.
 *
 * L'annotation de type suffit : sur un littéral, elle rejette déjà les champs
 * en trop comme les champs manquants, et elle garde un type exporté stable et
 * bon marché à vérifier — contrairement à un `as const` qui figerait 197
 * entrées en type littéral pour aucun gain côté consommateurs.
 */
export function serializeTypeScriptSnapshot(
  value: unknown,
  options: SnapshotModuleOptions,
): string {
  const { typeName, typeImportPath, exportName } = options;
  return [
    `import type { ${typeName} } from "${typeImportPath}";`,
    "",
    `export const ${exportName}: ${typeName} = ${JSON.stringify(value, null, 2)};`,
    "",
  ].join("\n");
}
