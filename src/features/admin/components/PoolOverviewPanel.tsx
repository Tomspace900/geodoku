import { Button } from "@/components/ui/button";
import { constraintLabel } from "@/features/admin/logic/display";
import { getCountryByCode } from "@/features/countries/lib/search";
import { useAction, useQuery } from "convex/react";
import { AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { GenerationReport } from "../../../../convex/lib/gridConstants";

function getCountryLabel(code: string): string {
  const country = getCountryByCode(code);
  if (!country) return code;
  return `${country.flagEmoji} ${country.names.fr}`;
}

const EXPOSURE_LIST_LIMIT = 15;

type Stat = { label: string; value: number | string; accent?: boolean };

function StatBlock({ label, value, accent }: Stat) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`font-serif text-3xl font-medium leading-none ${accent ? "text-brand" : "text-on-surface"}`}
      >
        {value}
      </span>
      <span className="text-[10px] tracking-widest uppercase text-on-surface-variant">
        {label}
      </span>
    </div>
  );
}

type ExposureRow = { label: string; pastCount: number; upcomingCount: number };

function ExposureList({
  title,
  rows,
  pastGridCount,
  upcomingGridCount,
}: {
  title: string;
  rows: ExposureRow[];
  pastGridCount: number;
  upcomingGridCount: number;
}) {
  if (rows.length === 0 || pastGridCount === 0) {
    return (
      <div>
        <p className="mb-2 text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
          {title}
        </p>
        <p className="text-xs text-on-surface-variant">
          Aucune donnée historique.
        </p>
      </div>
    );
  }

  const sorted = [...rows]
    .sort((a, b) => b.pastCount - a.pastCount)
    .slice(0, EXPOSURE_LIST_LIMIT);

  // Normalize both bars on the same scale so lengths are directly comparable
  const globalMax = Math.max(
    ...sorted.map((r) => r.pastCount / pastGridCount),
    upcomingGridCount > 0
      ? Math.max(...sorted.map((r) => r.upcomingCount / upcomingGridCount))
      : 0,
    0.01,
  );

  return (
    <div className="min-w-0">
      <p className="mb-2 text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
        {title}
      </p>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="w-28 shrink-0" />
        <span className="flex-1 text-center text-[9px] uppercase tracking-widest text-on-surface-variant/60">
          ← {pastGridCount}j passés
        </span>
        <span className="w-5 shrink-0" />
        <span className="flex-1 text-center text-[9px] uppercase tracking-widest text-on-surface-variant/60">
          {upcomingGridCount > 0
            ? `${upcomingGridCount}j planifiés →`
            : "— planifiés →"}
        </span>
        <span className="w-5 shrink-0" />
      </div>
      <ul className="flex flex-col gap-1.5">
        {sorted.map(({ label, pastCount, upcomingCount }) => {
          const pastRate = pastCount / pastGridCount;
          const upcomingRate =
            upcomingGridCount > 0 ? upcomingCount / upcomingGridCount : 0;
          const pastPct = Math.max(2, Math.round((pastRate / globalMax) * 100));
          const upcomingPct =
            upcomingGridCount > 0 && upcomingCount > 0
              ? Math.max(2, Math.round((upcomingRate / globalMax) * 100))
              : 0;

          // Amber warning if appeared in 33%+ of recent grids
          const isHighPast = pastRate >= 1 / 3;

          return (
            <li key={label} className="flex items-center gap-2 min-w-0">
              <span className="w-28 shrink-0 truncate text-[10px] text-on-surface">
                {label}
              </span>
              {/* Past bar */}
              <div className="flex flex-1 items-center gap-1">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-highest">
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 rounded-full bg-on-surface-variant/50 transition-all"
                    style={{ width: `${pastPct}%` }}
                  />
                </div>
                <span
                  className={`w-5 shrink-0 text-right text-[10px] tabular-nums ${
                    isHighPast
                      ? "font-semibold text-rarity-rare"
                      : "text-on-surface-variant"
                  }`}
                >
                  {pastCount}
                </span>
              </div>
              {/* Upcoming bar */}
              <div className="flex flex-1 items-center gap-1">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-highest">
                  <span
                    aria-hidden="true"
                    className={`absolute inset-y-0 left-0 rounded-full transition-all ${
                      upcomingPct > 0 ? "bg-brand/60" : ""
                    }`}
                    style={{ width: `${upcomingPct}%` }}
                  />
                </div>
                <span className="w-5 shrink-0 text-right text-[10px] tabular-nums text-on-surface-variant">
                  {upcomingCount}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type Props = {
  token: string;
  clearToken: () => void;
  hasTomorrowGrid: boolean | undefined;
};

export function PoolOverviewPanel({
  token,
  clearToken,
  hasTomorrowGrid,
}: Props) {
  const stats = useQuery(api.grids.getPoolStats, token ? {} : "skip");
  const exposure = useQuery(api.grids.getExposureStats, token ? {} : "skip");
  const generatePool = useAction(api.grids.generatePool);

  const [status, setStatus] = useState<
    "idle" | "loading" | { report: GenerationReport }
  >("idle");

  async function handleGenerate() {
    setStatus("loading");
    try {
      const report = await generatePool({ adminToken: token });
      setStatus({ report });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Unauthorized")) {
        clearToken();
      } else {
        setStatus("idle");
      }
    }
  }

  const constraintRows: ExposureRow[] = exposure
    ? (() => {
        const allIds = new Set([
          ...Object.keys(exposure.past.constraintCounts),
          ...Object.keys(exposure.upcoming.constraintCounts),
        ]);
        return [...allIds].map((id) => ({
          label: constraintLabel(id),
          pastCount: exposure.past.constraintCounts[id] ?? 0,
          upcomingCount: exposure.upcoming.constraintCounts[id] ?? 0,
        }));
      })()
    : [];

  const countryRows: ExposureRow[] = exposure
    ? (() => {
        const allCodes = new Set([
          ...Object.keys(exposure.past.countryCounts),
          ...Object.keys(exposure.upcoming.countryCounts),
        ]);
        return [...allCodes].map((code) => ({
          label: getCountryLabel(code),
          pastCount: exposure.past.countryCounts[code] ?? 0,
          upcomingCount: exposure.upcoming.countryCounts[code] ?? 0,
        }));
      })()
    : [];

  return (
    <section className="rounded-2xl bg-surface-low p-4 md:p-5">
      <p className="mb-4 text-[10px] font-semibold text-on-surface-variant tracking-widest uppercase">
        État du pool
      </p>

      <div className="mb-5 flex flex-wrap justify-around gap-4">
        <StatBlock label="en stock" value={stats?.available ?? "—"} accent />
        <StatBlock label="générées au total" value={stats?.total ?? "—"} />
      </div>

      {hasTomorrowGrid === false && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-rarity-ultra/10 px-3 py-2 text-sm text-rarity-ultra">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Aucune grille planifiée pour demain.
        </div>
      )}
      {hasTomorrowGrid === true && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Grille de demain planifiée.
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={status === "loading"}
            className="bg-on-surface text-surface-lowest hover:bg-on-surface/90"
          >
            {status === "loading" && <Loader2 className="animate-spin" />}
            {status === "loading" ? "Génération…" : "Générer une batch"}
          </Button>
          {typeof status === "object" && (
            <span className="text-xs text-on-surface-variant">
              {status.report.totalGenerated} grille
              {status.report.totalGenerated !== 1 ? "s" : ""} ajoutée
              {status.report.totalGenerated !== 1 ? "s" : ""} en{" "}
              {status.report.durationMs} ms
            </span>
          )}
        </div>
        <p className="mt-1.5 text-xs text-on-surface-variant">
          Génère ~12 nouvelles grilles par seed et les ajoute au stock.
        </p>
      </div>

      {exposure && (
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <ExposureList
            title="Exposition des contraintes"
            rows={constraintRows}
            pastGridCount={exposure.pastGridCount}
            upcomingGridCount={exposure.upcomingGridCount}
          />
          <ExposureList
            title="Exposition des pays"
            rows={countryRows}
            pastGridCount={exposure.pastGridCount}
            upcomingGridCount={exposure.upcomingGridCount}
          />
        </div>
      )}
    </section>
  );
}
