import { Ban, Gamepad2, type LucideIcon, ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { LegalBullet } from "./components/LegalBullet";
import { LegalContactSection } from "./components/LegalContactSection";
import { LegalLayout } from "./components/LegalLayout";
import { LegalSection } from "./components/LegalSection";
import { LegalTable } from "./components/LegalTable";

const PROMISES: readonly {
  icon: LucideIcon;
  titleKey: TKey;
  bodyKey: TKey;
}[] = [
  {
    icon: Gamepad2,
    titleKey: "privacy.promiseNoAccountTitle",
    bodyKey: "privacy.promiseNoAccountBody",
  },
  {
    icon: Ban,
    titleKey: "privacy.promiseNoAdsTitle",
    bodyKey: "privacy.promiseNoAdsBody",
  },
  {
    icon: ShieldCheck,
    titleKey: "privacy.promiseEuropeTitle",
    bodyKey: "privacy.promiseEuropeBody",
  },
];

const DATA_HEADERS: readonly TKey[] = [
  "privacy.dataColData",
  "privacy.dataColWhere",
  "privacy.dataColWhy",
  "privacy.dataColRetention",
];

const DATA_ROWS: readonly (readonly TKey[])[] = [
  [
    "privacy.dataLangName",
    "privacy.dataLangWhere",
    "privacy.dataLangWhy",
    "privacy.dataLangRetention",
  ],
  [
    "privacy.dataDeviceName",
    "privacy.dataDeviceWhere",
    "privacy.dataDeviceWhy",
    "privacy.dataDeviceRetention",
  ],
  [
    "privacy.dataDailyName",
    "privacy.dataDailyWhere",
    "privacy.dataDailyWhy",
    "privacy.dataDailyRetention",
  ],
  [
    "privacy.dataAccountName",
    "privacy.dataAccountWhere",
    "privacy.dataAccountWhy",
    "privacy.dataAccountRetention",
  ],
  [
    "privacy.dataSessionName",
    "privacy.dataSessionWhere",
    "privacy.dataSessionWhy",
    "privacy.dataSessionRetention",
  ],
  [
    "privacy.dataUsageName",
    "privacy.dataUsageWhere",
    "privacy.dataUsageWhy",
    "privacy.dataUsageRetention",
  ],
];

const DATA_NOTES: readonly { titleKey: TKey; bodyKey: TKey }[] = [
  {
    titleKey: "privacy.dataNoteGoogleTitle",
    bodyKey: "privacy.dataNoteGoogleBody",
  },
  {
    titleKey: "privacy.dataNoteNetworkTitle",
    bodyKey: "privacy.dataNoteNetworkBody",
  },
  {
    titleKey: "privacy.dataNoteLeaguesTitle",
    bodyKey: "privacy.dataNoteLeaguesBody",
  },
];

const RIGHTS: readonly { titleKey: TKey; bodyKey: TKey }[] = [
  {
    titleKey: "privacy.rightsAccountTitle",
    bodyKey: "privacy.rightsAccountBody",
  },
  {
    titleKey: "privacy.rightsCopyTitle",
    bodyKey: "privacy.rightsCopyBody",
  },
  {
    titleKey: "privacy.rightsBrowserTitle",
    bodyKey: "privacy.rightsBrowserBody",
  },
];

export function PrivacyPage() {
  const t = useT();

  return (
    <LegalLayout
      title={t("privacy.title")}
      eyebrow={t("privacy.eyebrow")}
      backLabel={t("privacy.backToGame")}
      lead={t("privacy.lead")}
      analyticsPage="privacy"
    >
      <div className="flex flex-col gap-7">
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {PROMISES.map(({ icon: Icon, titleKey, bodyKey }) => (
            <li
              key={titleKey}
              className="flex flex-col gap-2 rounded-xl bg-surface-low p-4"
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-brand/10 text-brand"
              >
                <Icon size={16} strokeWidth={2} />
              </span>
              <p className="font-sans text-sm font-semibold leading-snug text-on-surface">
                {t(titleKey)}
              </p>
              <p className="font-sans text-xs leading-relaxed text-on-surface-variant">
                {t(bodyKey)}
              </p>
            </li>
          ))}
        </ul>

        <LegalSection title={t("privacy.dataTitle")}>
          <LegalTable
            headers={DATA_HEADERS.map((key) => t(key))}
            rows={DATA_ROWS.map((row) => row.map((key) => t(key)))}
          />
          <ul className="mt-2 flex flex-col gap-2.5">
            {DATA_NOTES.map(({ titleKey, bodyKey }) => (
              <LegalBullet key={titleKey}>
                <span className="font-semibold text-on-surface">
                  {t(titleKey)}
                </span>{" "}
                {t(bodyKey)}
              </LegalBullet>
            ))}
          </ul>
        </LegalSection>

        <LegalSection title={t("privacy.rightsTitle")}>
          <ul className="flex flex-col gap-3">
            {RIGHTS.map(({ titleKey, bodyKey }) => (
              <LegalBullet key={titleKey}>
                <span className="block font-semibold text-on-surface">
                  {t(titleKey)}
                </span>
                {t(bodyKey)}
              </LegalBullet>
            ))}
          </ul>
        </LegalSection>

        <LegalContactSection
          title="privacy.contactTitle"
          bodyPre="privacy.contactBodyPre"
        />
      </div>
    </LegalLayout>
  );
}
