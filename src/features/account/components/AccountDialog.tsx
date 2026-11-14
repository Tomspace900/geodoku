import { usePostHog } from "@posthog/react";
import { useMutation } from "convex/react";
import {
  ArrowLeft,
  CircleAlert,
  LoaderCircle,
  Mail,
  MonitorSmartphone,
  WifiOff,
} from "lucide-react";
import { type FormEvent, useEffect, useId, useState } from "react";
import { AccentBar } from "@/components/editorial/AccentBar";
import { Eyebrow } from "@/components/editorial/Eyebrow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/i18n/LocaleContext";
import { authClient } from "@/lib/authClient";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import { useAccount } from "../AccountContext";
import { useEmailCode } from "../hooks/useEmailCode";
import { looksLikeEmail, type SendOutcome } from "../logic/codeOutcome";
import { forgetGoogleSignIn, markGoogleSignIn } from "../logic/googleSignIn";
import { pseudoErrorKey, refusalKey } from "../logic/pseudoMessage";
import { CodeStep } from "./CodeStep";
import { CountryField } from "./CountryField";
import { GoogleMark } from "./GoogleMark";
import { NameField } from "./NameField";
import { Notice } from "./Notice";

type Step = "choice" | "email" | "code" | "finishing";

/** Titre éditorial d'une fenêtre : italique, barre violette, capitales. */
function WindowHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col pr-8">
      <DialogTitle className="font-serif text-3xl font-medium italic leading-none tracking-normal text-on-surface">
        {title}
      </DialogTitle>
      <AccentBar className="mt-1" />
      {subtitle && <Eyebrow className="mt-1">{subtitle}</Eyebrow>}
    </div>
  );
}

function StepBack({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onClick}
      className="-mt-1 mb-1 w-fit gap-1.5 text-xs font-normal"
    >
      <ArrowLeft className="!size-3.5" aria-hidden />
      {label}
    </Button>
  );
}

/** Nouveau compte : le nom tiré, le pays, et c'est parti. */
function WelcomeStep({ onDone }: { onDone: () => void }) {
  const { t } = useLocale();
  const posthog = usePostHog();
  const account = useAccount();
  const updateProfile = useMutation(api.account.updateProfile);
  const [pseudo, setPseudo] = useState(account.profile?.pseudo ?? "");
  const [country, setCountry] = useState<string | null>(null);
  // Le dernier nom validé : le nom ne rebondit, au champ quitté, que s'il a
  // changé depuis. Il n'est enregistré qu'avec « C'est parti ».
  const [validated, setValidated] = useState(pseudo);
  const [bounceCount, setBounceCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<ReturnType<
    typeof refusalKey
  > | null>(null);
  const attached = account.welcome?.attached ?? 0;

  function validate() {
    const next = pseudo.trim();
    if (next === validated || pseudoErrorKey(pseudo) !== null) return;
    setValidated(next);
    setBounceCount((count) => count + 1);
  }

  async function finish() {
    setSaving(true);
    try {
      const result = await updateProfile({ pseudo, country });
      if (!result.ok) {
        setServerError(refusalKey(result.reason));
        return;
      }
      // Ni le nom ni le pays : seulement ce que le joueur en a fait.
      posthog?.capture("account_welcome_completed", {
        name_changed: pseudo.trim() !== account.profile?.pseudo,
        country_set: country !== null,
      });
      onDone();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <WindowHeading
        title={t("account.welcomeTitle")}
        subtitle={t("account.welcomeSubtitle")}
      />
      <DialogDescription className="sr-only">
        {t("account.welcomeDescription")}
      </DialogDescription>
      <NameField
        label={t("account.yourName")}
        value={pseudo}
        onChange={(next) => {
          setPseudo(next);
          setServerError(null);
        }}
        onCommit={validate}
        bounceCount={bounceCount}
        serverError={serverError}
      />
      <CountryField
        label={t("account.yourCountry")}
        value={country}
        onChange={setCountry}
      />
      {attached > 0 && (
        <p className="flex items-start gap-2.5 text-sm text-on-surface-variant">
          <MonitorSmartphone
            className="mt-0.5 size-4 shrink-0 text-brand"
            aria-hidden
          />
          {attached === 1
            ? t("account.attachedOne")
            : t("account.attachedMany", { count: attached })}
        </p>
      )}
      <Button
        type="button"
        className="h-11 w-full gap-2"
        onClick={() => void finish()}
        disabled={saving || pseudoErrorKey(pseudo) !== null}
      >
        {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
        {t("account.letsGo")}
      </Button>
    </div>
  );
}

function EmailForm({
  email,
  onEmailChange,
  onSent,
}: {
  email: string;
  onEmailChange: (email: string) => void;
  onSent: () => void;
}) {
  const { t } = useLocale();
  const id = useId();
  const { send } = useEmailCode("sign-in");
  const [outcome, setOutcome] = useState<Exclude<SendOutcome, "sent"> | null>(
    null,
  );
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!looksLikeEmail(email)) {
      setOutcome("invalid_email");
      return;
    }
    setSending(true);
    const result = await send(email);
    setSending(false);
    if (result === "sent") {
      setOutcome(null);
      onSent();
      return;
    }
    setOutcome(result);
  }

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => void submit(e)}>
      <div className="flex flex-col gap-1">
        <label htmlFor={id}>
          <Eyebrow as="span">{t("account.emailLabel")}</Eyebrow>
        </label>
        <Input
          id={id}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={t("account.emailPlaceholder")}
          value={email}
          onChange={(event) => {
            onEmailChange(event.target.value);
            if (outcome === "invalid_email") setOutcome(null);
          }}
          aria-invalid={outcome === "invalid_email"}
          className={cn(
            "h-11 text-base",
            outcome === "invalid_email" &&
              "border-error focus-visible:border-error",
          )}
        />
        {outcome === "invalid_email" && (
          <p className="pt-1 text-xs text-error">{t("account.invalidEmail")}</p>
        )}
      </div>
      {outcome === "offline" && (
        <Notice icon={<WifiOff />}>{t("account.offline")}</Notice>
      )}
      {outcome === "too_many" && (
        <Notice icon={<CircleAlert />}>{t("account.tooManyCodes")}</Notice>
      )}
      <Button
        type="submit"
        className="h-11 w-full gap-2"
        disabled={sending || outcome === "too_many"}
      >
        {sending && (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        )}
        {outcome === "offline" ? t("account.retry") : t("account.sendCode")}
      </Button>
    </form>
  );
}

/**
 * « Mon compte » (#155) : une fenêtre, un seul parcours pour créer son compte
 * ou le retrouver. On y va chercher un code dans sa messagerie : une fenêtre
 * ne se ferme pas d'un geste par mégarde. Un nouveau compte y reçoit sa
 * bienvenue, y compris au retour de Google.
 */
export function AccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, localizedPath } = useLocale();
  const posthog = usePostHog();
  const account = useAccount();
  const [step, setStep] = useState<Step>("choice");
  const [email, setEmail] = useState("");
  const welcoming = account.welcome !== null && account.profile?.pseudo;
  const visible = open || Boolean(welcoming);

  // Code juste : la session arrive, le rattachement passe. Un compte qui
  // existait déjà revient directement à la page, sans message.
  useEffect(() => {
    if (step !== "finishing" || !account.synced) return;
    if (account.welcome === null) {
      setStep("choice");
      onOpenChange(false);
    }
  }, [step, account.synced, account.welcome, onOpenChange]);

  function close() {
    if (welcoming) account.dismissWelcome();
    setStep("choice");
    onOpenChange(false);
  }

  function continueWithGoogle() {
    posthog?.capture("account_sign_in_started", { method: "google" });
    markGoogleSignIn();
    const page = `${window.location.origin}${localizedPath("/stats")}`;
    void authClient.signIn.social({
      provider: "google",
      callbackURL: page,
      // Google annulé : retour au choix, sans message.
      errorCallbackURL: `${page}?compte=1`,
    });
  }

  return (
    <Dialog
      open={visible}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <DialogContent
        placement="bottom-sheet"
        closeLabel={t("ui.closeDialog")}
        className="flex max-h-[90dvh] flex-col gap-6 overflow-y-auto px-5 pb-8 pt-7 sm:max-w-md sm:px-7"
      >
        {welcoming ? (
          <WelcomeStep onDone={close} />
        ) : step === "code" || step === "finishing" ? (
          <>
            <div className="flex flex-col">
              <StepBack
                label={t("account.emailLabel")}
                onClick={() => setStep("email")}
              />
              <WindowHeading title={t("account.checkEmail")} />
            </div>
            <DialogDescription className="sr-only">
              {t("account.dialogDescription")}
            </DialogDescription>
            {step === "finishing" ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-on-surface-variant">
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
                {t("account.verifying")}
              </p>
            ) : (
              <CodeStep
                email={email.trim()}
                purpose="sign-in"
                onVerified={() => {
                  posthog?.capture("account_signed_in", { method: "email" });
                  setStep("finishing");
                }}
                onChangeEmail={() => setStep("email")}
              />
            )}
          </>
        ) : (
          <>
            {step === "email" && (
              <StepBack
                label={t("account.back")}
                onClick={() => setStep("choice")}
              />
            )}
            <WindowHeading
              title={t("account.dialogTitle")}
              subtitle={t("account.dialogSubtitle")}
            />
            <DialogDescription className="sr-only">
              {t("account.dialogDescription")}
            </DialogDescription>
            {step === "email" ? (
              <EmailForm
                email={email}
                onEmailChange={setEmail}
                onSent={() => setStep("code")}
              />
            ) : (
              <div className="flex flex-col gap-2.5">
                <Button
                  type="button"
                  onClick={() => {
                    posthog?.capture("account_sign_in_started", {
                      method: "email",
                    });
                    forgetGoogleSignIn();
                    setStep("email");
                  }}
                  className="h-11 w-full gap-2.5"
                >
                  <Mail className="size-[18px]" aria-hidden />
                  {t("account.continueWithEmail")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={continueWithGoogle}
                  className="h-11 w-full gap-2.5"
                >
                  <GoogleMark />
                  {t("account.continueWithGoogle")}
                </Button>
              </div>
            )}
            <p className="text-xs leading-relaxed text-on-surface-variant">
              {t("account.keepOnlyEmail")}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
