import { usePostHog } from "@posthog/react";
import {
  ArrowLeft,
  EyeOff,
  LoaderCircle,
  Smartphone,
  Trash2,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { SheetDrawer } from "@/components/SheetDrawer";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { authClient } from "@/lib/authClient";
import { useAccount } from "../AccountContext";
import { useEmailCode } from "../hooks/useEmailCode";
import type { SendOutcome } from "../logic/codeOutcome";
import { CodeStep } from "./CodeStep";
import { Notice } from "./Notice";

type View = "account" | "confirm" | "code";

function BackTo({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onClick}
      className="mb-4 w-fit gap-1.5 text-xs font-normal"
    >
      <ArrowLeft className="!size-3.5" aria-hidden />
      {label}
    </Button>
  );
}

function DeleteLine({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 text-sm text-on-surface">
      <span className="mt-0.5 shrink-0 text-on-surface-variant [&_svg]:size-4">
        {icon}
      </span>
      <span>{children}</span>
    </li>
  );
}

/**
 * « Mon compte » (#155) : l'e-mail, la déconnexion et la suppression, rien
 * d'autre. La suppression change le contenu sur place et se confirme par un
 * code reçu par e-mail : il redonne la session « fraîche » que Better Auth
 * exige pour supprimer sans mot de passe. Les parties restent, anonymes.
 */
export function AccountDrawer({
  open,
  email,
  gamesCount,
  onClose,
}: {
  open: boolean;
  email: string;
  gamesCount: number;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const posthog = usePostHog();
  const account = useAccount();
  const { send } = useEmailCode("delete-account");
  const [view, setView] = useState<View>("account");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<Exclude<
    SendOutcome,
    "sent"
  > | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  function reset() {
    setView("account");
    setSendError(null);
    setDeleteFailed(false);
  }

  async function requestCode() {
    setSending(true);
    const outcome = await send(email);
    setSending(false);
    if (outcome === "sent") {
      setSendError(null);
      setView("code");
      return;
    }
    setSendError(outcome);
  }

  async function deleteAccount() {
    const { error } = await authClient.deleteUser();
    if (error) {
      setDeleteFailed(true);
      return;
    }
    posthog?.capture("account_deleted");
    reset();
    onClose();
  }

  const title =
    view === "account"
      ? t("account.myAccount")
      : view === "confirm"
        ? t("account.deleteTitle")
        : t("account.deleteLastStep");

  return (
    <SheetDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
          onClose();
        }
      }}
      title={title}
      subtitle={view === "code" ? t("account.deleteCodeSubtitle") : undefined}
      closeLabel={t("stats.closeDrawer")}
    >
      {view === "account" && (
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-low px-4 py-3">
            <span className="text-sm text-on-surface">
              {t("account.email")}
            </span>
            <span className="truncate text-sm text-on-surface-variant">
              {email}
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="h-11 w-full"
            onClick={() => {
              posthog?.capture("account_signed_out");
              void account.signOut();
              onClose();
            }}
          >
            {t("account.signOut")}
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={() => setView("confirm")}
            className="mx-auto mt-3 text-xs text-error decoration-error/30 hover:text-error"
          >
            {t("account.deleteAccount")}
          </Button>
        </div>
      )}

      {view === "confirm" && (
        <div className="flex flex-col gap-6">
          <BackTo label={t("account.backToAccount")} onClick={reset} />
          <ul className="-mt-4 flex flex-col gap-3.5">
            <DeleteLine icon={<Trash2 />}>
              <span className="font-medium">
                {t("account.deleteErasedLabel")}
              </span>{" "}
              {t("account.deleteErased")}
            </DeleteLine>
            <DeleteLine icon={<EyeOff />}>
              <span className="font-medium">
                {gamesCount === 0
                  ? t("account.deleteGamesKeptNone")
                  : gamesCount === 1
                    ? t("account.deleteGamesKeptOne")
                    : t("account.deleteGamesKeptMany", { count: gamesCount })}
              </span>{" "}
              {t("account.deleteGamesKept")}
            </DeleteLine>
            <DeleteLine icon={<Smartphone />}>
              {t("account.deleteDeviceKept")}
            </DeleteLine>
          </ul>
          {sendError === "too_many" && (
            <Notice>{t("account.tooManyCodes")}</Notice>
          )}
          {(sendError === "offline" || sendError === "invalid_email") && (
            <Notice>{t("account.offline")}</Notice>
          )}
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11 w-full gap-2 bg-error text-surface-lowest hover:bg-error/90"
              disabled={sending || sendError === "too_many"}
              onClick={() => void requestCode()}
            >
              {sending && (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              )}
              {t("account.deleteSendCode")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={reset}
            >
              {t("account.cancel")}
            </Button>
          </div>
        </div>
      )}

      {view === "code" && (
        <div className="flex flex-col gap-4">
          <BackTo label={t("account.backToAccount")} onClick={reset} />
          {deleteFailed && <Notice>{t("account.deleteFailed")}</Notice>}
          <CodeStep
            email={email}
            purpose="delete-account"
            onVerified={deleteAccount}
          />
        </div>
      )}
    </SheetDrawer>
  );
}
