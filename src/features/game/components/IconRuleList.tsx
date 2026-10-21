import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";

export type IconRule = {
  icon: LucideIcon;
  titleKey: TKey;
  bodyKey: TKey;
  BodyComponent?: ComponentType<{ className?: string }>;
};

/**
 * Liste de règles illustrées (pastille d'icône, titre, texte), partagée par la
 * modale « Comment jouer ? », le calcul du score et la page « À propos »
 * (#142) : les règles y sont les mêmes, mot pour mot.
 */
export function IconRuleList({ rules }: { rules: readonly IconRule[] }) {
  const t = useT();

  return (
    <ol className="space-y-4">
      {rules.map(({ icon: Icon, titleKey, bodyKey, BodyComponent }) => (
        <li key={titleKey} className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
            <Icon size={17} strokeWidth={2} />
          </span>
          <div className="space-y-0.5 pt-0.5">
            <p className="font-sans text-sm font-semibold text-on-surface leading-snug">
              {t(titleKey)}
            </p>
            <p className="font-sans text-xs text-on-surface-variant leading-relaxed">
              {t(bodyKey)}
            </p>
            {BodyComponent && <BodyComponent className="pt-2" />}
          </div>
        </li>
      ))}
    </ol>
  );
}
