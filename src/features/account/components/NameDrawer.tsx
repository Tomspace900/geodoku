import { useMutation } from "convex/react";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { api } from "../../../../convex/_generated/api";
import { pseudoErrorKey, refusalKey } from "../logic/pseudoMessage";
import { NameField } from "./NameField";

/** « Mon nom » : le même champ et le dé ; rien n'est enregistré avant. */
export function NameDrawer({
  open,
  current,
  onClose,
}: {
  open: boolean;
  current: string;
  onClose: () => void;
}) {
  const { t, locale } = useLocale();
  const drawPseudo = useMutation(api.account.drawPseudoFor);
  const updateProfile = useMutation(api.account.updateProfile);
  const [value, setValue] = useState(current);
  const [drawing, setDrawing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<ReturnType<
    typeof refusalKey
  > | null>(null);

  // Chaque ouverture repart du nom enregistré.
  useEffect(() => {
    if (open) {
      setValue(current);
      setServerError(null);
    }
  }, [open, current]);

  async function draw() {
    setDrawing(true);
    try {
      setValue(await drawPseudo({ locale, current: value }));
      setServerError(null);
    } finally {
      setDrawing(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const result = await updateProfile({ pseudo: value });
      if (!result.ok) {
        setServerError(refusalKey(result.reason));
        return;
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SheetDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={t("account.myName")}
      closeLabel={t("stats.closeDrawer")}
    >
      <form
        className="flex flex-col gap-6 pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <NameField
          label={t("account.myName")}
          hideLabel
          value={value}
          onChange={(next) => {
            setValue(next);
            setServerError(null);
          }}
          onDraw={() => void draw()}
          drawing={drawing}
          serverError={serverError}
        />
        <Button
          type="submit"
          className="h-11 w-full gap-2"
          disabled={saving || pseudoErrorKey(value) !== null}
        >
          {saving && (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          )}
          {t("account.save")}
        </Button>
      </form>
    </SheetDrawer>
  );
}
