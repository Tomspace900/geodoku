import { usePostHog } from "@posthog/react";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  ChevronRight,
  EyeOff,
  LoaderCircle,
  Smartphone,
  Trash2,
  WifiOff,
} from "lucide-react";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { SheetDrawer } from "@/components/SheetDrawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";
import { authClient } from "@/lib/authClient";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import {
  type AccountProfile,
  forgetSessionOnDevice,
  useAccount,
} from "../AccountContext";
import { useEmailCode } from "../hooks/useEmailCode";
import { useNameEditing } from "../hooks/useNameEditing";
import { looksLikeEmail, type SendOutcome } from "../logic/codeOutcome";
import { CodeStep } from "./CodeStep";
import { CountryField } from "./CountryField";
import { NameField } from "./NameField";
import { Notice } from "./Notice";

type View = "account" | "email" | "email-code" | "confirm" | "delete-code";

/** Refus d'une nouvelle adresse : sous le champ, ou en encadré (réseau, limite). */
type EmailError = "invalid" | "same" | "offline" | "too_many";

const EMAIL_ERROR_KEY: Record<"invalid" | "same", TKey> = {
  invalid: "account.invalidEmail",
  same: "account.emailSame",
};

function emailErrorFromSend(outcome: Exclude<SendOutcome, "sent">): EmailError {
  if (outcome === "too_many") return "too_many";
  if (outcome === "invalid_email") return "invalid";
  return "offline";
}

function BackTo({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onClick}
      className="w-fit gap-1.5 text-xs font-normal"
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

/** « Mon e-mail » : au même trait que le pays, il ouvre « Changer d'e-mail ». */
function EmailRow({ email, onOpen }: { email: string; onOpen: () => void }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-col gap-1">
      <Eyebrow as="span">{t("account.myEmail")}</Eyebrow>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onOpen}
        aria-label={`${t("account.myEmail")} : ${email}`}
        className="flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-none border-b border-outline-variant/40 px-0 text-base font-normal text-on-surface hover:text-on-surface"
      >
        <span className="truncate">{email}</span>
        <ChevronRight
          className="!size-4 shrink-0 text-on-surface-variant"
          aria-hidden
        />
      </Button>
    </div>
  );
}

/**
 * « Changer d'e-mail » : la nouvelle adresse. Qu'elle ait déjà un compte ou
 * non, l'écran du code suit (Better Auth n'envoie alors rien) : quelqu'un qui
 * essaie l'adresse d'un autre n'apprend rien, comme à la connexion.
 */
function NewEmailForm({
  value,
  currentEmail,
  onChange,
  onSent,
}: {
  value: string;
  currentEmail: string;
  onChange: (value: string) => void;
  onSent: () => void;
}) {
  const { t } = useLocale();
  const id = useId();
  const { send } = useEmailCode("change-email");
  const [error, setError] = useState<EmailError | null>(null);
  const [sending, setSending] = useState(false);
  const fieldError = error === "invalid" || error === "same" ? error : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!looksLikeEmail(value)) {
      setError("invalid");
      return;
    }
    if (value.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setError("same");
      return;
    }
    setSending(true);
    const outcome = await send(value);
    setSending(false);
    if (outcome === "sent") {
      setError(null);
      onSent();
      return;
    }
    setError(emailErrorFromSend(outcome));
  }

  return (
    <form
      className="flex flex-col gap-6 pt-2"
      onSubmit={(event) => void submit(event)}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={id}>
          <Eyebrow as="span">{t("account.newEmail")}</Eyebrow>
        </label>
        <Input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t("account.emailPlaceholder")}
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            if (fieldError) setError(null);
          }}
          aria-invalid={fieldError !== null}
          aria-describedby={fieldError ? `${id}-error` : undefined}
          className={cn(
            "h-11 text-base",
            fieldError && "border-error focus-visible:border-error",
          )}
        />
        {fieldError && (
          <p id={`${id}-error`} className="pt-1 text-xs text-error">
            {t(EMAIL_ERROR_KEY[fieldError])}
          </p>
        )}
      </div>
      {error === "offline" && (
        <Notice icon={<WifiOff />}>{t("account.offline")}</Notice>
      )}
      {error === "too_many" && <Notice>{t("account.tooManyCodes")}</Notice>}
      <Button
        type="submit"
        className="h-11 w-full gap-2"
        disabled={sending || error === "too_many"}
      >
        {sending && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        )}
        {t("account.sendCode")}
      </Button>
    </form>
  );
}

/**
 * « Mon compte » (#155) : un seul tiroir pour tout, ouvert par « Mon
 * compte › » en bas de « Mes stats ». Le nom s'enregistre en quittant le
 * champ, le pays dès qu'il est choisi, cherché sur place ; aucun bouton
 * « Enregistrer ». Le changement d'e-mail et la suppression s'affichent sur
 * place, avec « ← Mon compte ». La suppression se confirme par un code : il redonne la
 * session « fraîche » que Better Auth exige pour supprimer sans mot de passe.
 */
export function AccountDrawer({
  open,
  profile,
  gamesCount,
  onClose,
}: {
  open: boolean;
  profile: AccountProfile;
  gamesCount: number;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const posthog = usePostHog();
  const account = useAccount();
  const updateProfile = useMutation(api.account.updateProfile);
  const { send } = useEmailCode("delete-account");
  const name = useNameEditing(profile.pseudo ?? "");
  const [view, setView] = useState<View>("account");
  const [newEmail, setNewEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<Exclude<
    SendOutcome,
    "sent"
  > | null>(null);
  const [deleteFailed, setDeleteFailed] = useState(false);

  function backToAccount() {
    setView("account");
    setSendError(null);
    setDeleteFailed(false);
  }

  function saveCountry(country: string | null) {
    // Un échec laisse simplement le pays d'avant à l'écran.
    updateProfile({ country }).catch(() => {});
  }

  /** Après une déconnexion ou une suppression, plus rien à enregistrer. */
  function close({ commit = true }: { commit?: boolean } = {}) {
    if (commit) void name.commit();
    name.reset();
    setView("account");
    setNewEmail("");
    setSendError(null);
    setDeleteFailed(false);
    onClose();
  }

  async function requestDeleteCode() {
    setSending(true);
    const outcome = await send(profile.email);
    setSending(false);
    if (outcome === "sent") {
      setSendError(null);
      setView("delete-code");
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
    forgetSessionOnDevice();
    close({ commit: false });
  }

  const header: Record<
    View,
    { title: string; subtitle?: string; back?: ReactNode }
  > = {
    account: { title: t("account.myAccount") },
    email: {
      title: t("account.changeEmailTitle"),
      back: (
        <BackTo label={t("account.backToAccount")} onClick={backToAccount} />
      ),
    },
    "email-code": {
      title: t("account.checkEmail"),
      back: (
        <BackTo
          label={t("account.changeEmailTitle")}
          onClick={() => setView("email")}
        />
      ),
    },
    confirm: {
      title: t("account.deleteTitle"),
      back: (
        <BackTo label={t("account.backToAccount")} onClick={backToAccount} />
      ),
    },
    "delete-code": {
      title: t("account.deleteLastStep"),
      subtitle: t("account.deleteCodeSubtitle"),
      back: (
        <BackTo label={t("account.backToAccount")} onClick={backToAccount} />
      ),
    },
  };

  return (
    <SheetDrawer
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title={header[view].title}
      subtitle={header[view].subtitle}
      back={header[view].back}
      closeLabel={t("stats.closeDrawer")}
    >
      {view === "account" && (
        <div className="flex flex-col gap-6 pt-2">
          <NameField
            label={t("account.myName")}
            value={name.value}
            onChange={name.change}
            onDraw={() => void name.draw()}
            onCommit={() => void name.commit()}
            drawing={name.drawing}
            drawCount={name.drawCount}
            serverError={name.serverError}
          />
          <CountryField
            label={t("account.myCountry")}
            value={profile.country}
            onChange={saveCountry}
          />
          <EmailRow
            email={profile.email}
            onOpen={() => {
              setNewEmail("");
              setView("email");
            }}
          />
          <div className="flex flex-col gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11 w-full"
              onClick={() => {
                posthog?.capture("account_signed_out");
                void account.signOut();
                close({ commit: false });
              }}
            >
              {t("account.signOut")}
            </Button>
            <Button
              type="button"
              variant="link"
              onClick={() => setView("confirm")}
              className="mx-auto mt-1 text-xs text-error decoration-error/30 hover:text-error"
            >
              {t("account.deleteAccount")}
            </Button>
          </div>
        </div>
      )}

      {view === "email" && (
        <NewEmailForm
          value={newEmail}
          currentEmail={profile.email}
          onChange={setNewEmail}
          onSent={() => setView("email-code")}
        />
      )}

      {view === "email-code" && (
        <div className="pt-2">
          <CodeStep
            email={newEmail}
            purpose="change-email"
            onVerified={() => {
              posthog?.capture("account_email_changed");
              setNewEmail("");
              backToAccount();
            }}
          />
        </div>
      )}

      {view === "confirm" && (
        <div className="flex flex-col gap-6 pt-2">
          <ul className="flex flex-col gap-3.5">
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
              onClick={() => void requestDeleteCode()}
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
              onClick={backToAccount}
            >
              {t("account.cancel")}
            </Button>
          </div>
        </div>
      )}

      {view === "delete-code" && (
        <div className="flex flex-col gap-4 pt-2">
          {deleteFailed && <Notice>{t("account.deleteFailed")}</Notice>}
          <CodeStep
            email={profile.email}
            purpose="delete-account"
            onVerified={deleteAccount}
          />
        </div>
      )}
    </SheetDrawer>
  );
}
