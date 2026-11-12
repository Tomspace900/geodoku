import { SheetDrawer } from "@/components/SheetDrawer";
import { useLocale } from "@/i18n/LocaleContext";
import { useAfterRoll } from "../hooks/useAfterRoll";
import { randomCountry } from "../logic/countryPick";
import { CountryPicker } from "./CountryPicker";
import { DiceButton } from "./DiceButton";

/**
 * « Ton pays » dans la bienvenue (#155) : la liste des pays en tiroir,
 * par-dessus la fenêtre, avec un dé en haut à droite. Connecté, la même
 * liste s'affiche sur place dans « Mon compte ».
 */
export function CountryDrawer({
  open,
  current,
  onChoose,
  onClose,
}: {
  open: boolean;
  current: string | null;
  /** `null` : retirer le pays. */
  onChoose: (iso3: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const roll = useAfterRoll();

  return (
    <SheetDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          roll.cancel();
          onClose();
        }
      }}
      title={t("account.myCountry")}
      subtitle={t("account.optional")}
      action={
        <DiceButton
          label={t("account.drawCountry")}
          onClick={() => {
            const drawn = randomCountry(current);
            roll.after(() => onChoose(drawn));
          }}
          className="-mt-1"
        />
      }
      closeLabel={t("stats.closeDrawer")}
      tall
    >
      <CountryPicker
        current={current}
        onChoose={(iso3) => {
          roll.cancel();
          onChoose(iso3);
        }}
      />
    </SheetDrawer>
  );
}
