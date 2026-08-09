import { useT } from "@/i18n/LocaleContext";

const SKELETON_KEYS = [
  "r0c0",
  "r0c1",
  "r0c2",
  "r0c3",
  "r1c0",
  "r1c1",
  "r1c2",
  "r1c3",
  "r2c0",
  "r2c1",
  "r2c2",
  "r2c3",
  "r3c0",
  "r3c1",
  "r3c2",
  "r3c3",
] as const;

/** Squelette 4×4 (en-têtes + grille) affiché le temps du chargement. */
export function GridSkeleton() {
  const t = useT();
  return (
    <div aria-busy="true">
      <output aria-live="polite" className="sr-only">
        {t("ui.loadingGrid")}
      </output>
      <div
        aria-hidden="true"
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "minmax(0,1fr) repeat(3, minmax(0,1fr))",
        }}
      >
        {SKELETON_KEYS.map((key) => (
          <div
            key={key}
            className="aspect-square animate-pulse rounded-xl bg-surface-highest motion-reduce:animate-none"
          />
        ))}
      </div>
    </div>
  );
}
