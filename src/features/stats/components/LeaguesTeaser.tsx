import { Trophy } from "lucide-react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { useLocale } from "@/i18n/LocaleContext";

/** Connecté : l'annonce des ligues, sans bouton ni mesure du clic. */
export function LeaguesTeaser() {
  const { t } = useLocale();
  return (
    <div className="flex items-start gap-3 rounded-xl bg-surface-low p-4">
      <Trophy className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
      <div className="flex flex-col gap-1">
        <Eyebrow className="text-brand">{t("stats.leaguesSoon")}</Eyebrow>
        <p className="font-serif text-lg font-medium leading-tight text-on-surface">
          {t("stats.leaguesTitle")}
        </p>
        <p className="text-sm text-on-surface-variant">
          {t("stats.leaguesBody")}
        </p>
      </div>
    </div>
  );
}
