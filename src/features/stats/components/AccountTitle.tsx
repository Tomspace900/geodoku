import { useMutation } from "convex/react";
import { useState } from "react";
import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import { CountrySearch } from "@/features/account/components/CountrySearch";
import { NameField } from "@/features/account/components/NameField";
import { useBounce } from "@/features/account/hooks/useBounce";
import { useNameEditing } from "@/features/account/hooks/useNameEditing";
import { useOutsidePointer } from "@/features/account/hooks/useOutsidePointer";
import {
  randomCountry,
  WHITE_FLAG,
} from "@/features/account/logic/countryPick";
import { getCountryByIso3 } from "@/features/countries/logic/search";
import { useLocale } from "@/i18n/LocaleContext";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";

type Mode = "rest" | "name" | "country";

/**
 * Connecté, le titre de « Mes stats » devient le joueur : son drapeau
 * (drapeau blanc sans pays) et son nom, sans aucun indice au repos. Un tap sur
 * le nom l'écrit sur place (le dé apparaît) ; un tap sur le drapeau met la
 * recherche du pays à la place du nom, la liste dessous. Entrée ou un tap
 * ailleurs enregistre le nom, Échap annule ; un pays de la liste est posé et
 * ramène le titre, le dé en pose un sans fermer. « Mon compte » ne s'ouvre
 * plus d'ici : seulement par « Mon compte › », en bas de la page.
 */
export function AccountTitle({
  pseudo,
  country,
}: {
  pseudo: string;
  country: string | null;
}) {
  const { t, locale } = useLocale();
  const updateProfile = useMutation(api.account.updateProfile);
  const name = useNameEditing(pseudo);
  const [mode, setMode] = useState<Mode>("rest");
  // Au niveau du titre : le drapeau change d'élément avec le mode, son rebond
  // ne repart pas pour autant, et un pays choisi rebondit une fois revenu.
  const flagBounce = useBounce(country);
  const chosen = country ? getCountryByIso3(country) : undefined;

  function saveCountry(iso3: string | null) {
    // Un échec laisse simplement le pays d'avant.
    updateProfile({ country: iso3 }).catch(() => {});
  }

  /** Un tap ailleurs abandonne un nom en erreur ; sinon il l'enregistre. */
  async function leaveName(fromOutside: boolean) {
    if (fromOutside && name.hasError) {
      name.reset();
      setMode("rest");
      return;
    }
    if (await name.commit()) setMode("rest");
  }

  const ref = useOutsidePointer<HTMLDivElement>(mode !== "rest", () => {
    if (mode === "name") void leaveName(true);
    else setMode("rest");
  });

  function toggleCountry() {
    if (mode === "country") {
      setMode("rest");
      return;
    }
    if (mode === "name") {
      if (name.hasError) name.reset();
      else void name.commit();
    }
    setMode("country");
  }

  const flagBadge = (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={toggleCountry}
      aria-expanded={mode === "country"}
      aria-label={
        chosen
          ? t("account.countryLabel", { country: chosen.names[locale] })
          : t("account.myCountry")
      }
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-surface-low text-2xl leading-none hover:bg-surface-highest/60",
        mode === "country" && "ring-2 ring-on-surface/30",
      )}
    >
      <span
        key={flagBounce.key}
        aria-hidden
        className={cn(
          "inline-block origin-center",
          flagBounce.bouncing && "animate-flag-bounce",
        )}
      >
        {chosen?.flagEmoji ?? WHITE_FLAG}
      </span>
    </Button>
  );

  if (mode === "name") {
    return (
      <div ref={ref} className="flex flex-col">
        <h1 className="sr-only">{pseudo}</h1>
        <NameField
          variant="title"
          label={t("account.myName")}
          leading={flagBadge}
          value={name.value}
          onChange={name.change}
          onDraw={() => void name.draw()}
          onCommit={() => void leaveName(false)}
          onCancel={() => {
            name.reset();
            setMode("rest");
          }}
          drawing={name.drawing}
          drawCount={name.drawCount}
          serverError={name.serverError}
          autoFocus
        />
        <Eyebrow className="mt-2">{t("stats.title")}</Eyebrow>
      </div>
    );
  }

  if (mode === "country") {
    return (
      <div ref={ref} className="flex flex-col">
        <h1 className="sr-only">{pseudo}</h1>
        <CountrySearch
          current={country}
          before={flagBadge}
          onPick={(iso3) => {
            setMode("rest");
            saveCountry(iso3);
          }}
          onDraw={() => saveCountry(randomCountry(country))}
          onCancel={() => setMode("rest")}
        />
      </div>
    );
  }

  return (
    <DisplayHeader
      as="h1"
      size="lg"
      leftIcon={flagBadge}
      title={
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => setMode("name")}
          aria-label={`${pseudo}, ${t("account.editName")}`}
          className="max-w-full whitespace-normal break-words text-left font-serif text-3xl font-medium italic leading-none text-on-surface hover:text-on-surface"
        >
          {pseudo}
        </Button>
      }
      eyebrow={t("stats.title")}
    />
  );
}
