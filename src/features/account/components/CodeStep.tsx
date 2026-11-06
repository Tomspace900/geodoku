import { Check, LoaderCircle, Mail, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/i18n/LocaleContext";
import { type CodePurpose, useEmailCode } from "../hooks/useEmailCode";
import { formatCountdown, type VerifyOutcome } from "../logic/codeOutcome";
import { CodeInput } from "./CodeInput";
import { Notice } from "./Notice";

/** « Renvoyer le code » grisé une minute après chaque envoi. */
const RESEND_COOLDOWN_MS = 60_000;
/** Au bout de 30 s sans code : regarder dans les spams. */
const SPAM_HINT_MS = 30_000;
const TICK_MS = 1000;
export const CODE_SENDER = "compte@geodoku.app";

type Status = "idle" | "verifying" | Exclude<VerifyOutcome, "ok">;

/**
 * Le code reçu par e-mail : six cases qui valident seules au 6ᵉ chiffre,
 * pour se connecter comme pour supprimer son compte. Le premier code est
 * déjà parti quand l'étape s'affiche.
 */
export function CodeStep({
  email,
  purpose,
  onVerified,
  onChangeEmail,
}: {
  email: string;
  purpose: CodePurpose;
  onVerified: () => void | Promise<void>;
  onChangeEmail?: () => void;
}) {
  const { t } = useLocale();
  const { send, verify } = useEmailCode(purpose);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [shakeKey, setShakeKey] = useState(0);
  const [sentAt, setSentAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [notice, setNotice] = useState<
    "resent" | "too_many" | "send_offline" | null
  >(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  const dead = status === "too_many_attempts" || status === "expired";
  const cooldown = RESEND_COOLDOWN_MS - (now - sentAt);

  async function submit(code: string) {
    if (status === "verifying") return;
    setStatus("verifying");
    setNotice(null);
    const outcome = await verify(email, code);
    if (outcome === "ok") {
      await onVerified();
      return;
    }
    setStatus(outcome);
    if (outcome === "wrong") setShakeKey((key) => key + 1);
  }

  async function resend() {
    setSending(true);
    const outcome = await send(email);
    setSending(false);
    if (outcome === "sent") {
      setSentAt(Date.now());
      setNow(Date.now());
      setValue("");
      setStatus("idle");
      setNotice("resent");
      return;
    }
    setNotice(outcome === "too_many" ? "too_many" : "send_offline");
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-on-surface-variant">
        {t("account.codeSentTo", { email })}{" "}
        {onChangeEmail && (
          <Button
            type="button"
            variant="link"
            onClick={onChangeEmail}
            className="align-baseline text-sm"
          >
            {t("account.changeEmail")}
          </Button>
        )}
      </p>

      <CodeInput
        value={value}
        onChange={(next) => {
          setValue(next);
          if (status === "wrong" || status === "offline") setStatus("idle");
        }}
        onComplete={(code) => void submit(code)}
        tone={status === "wrong" ? "error" : dead ? "dead" : "idle"}
        label={t("account.codeLabel")}
        // Pendant la vérification, le champ garde le focus (et le clavier).
        disabled={dead}
        shakeKey={shakeKey}
        autoFocus
      />

      {status === "verifying" && (
        <p className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
          {t("account.verifying")}
        </p>
      )}
      {status === "wrong" && <Notice>{t("account.wrongCode")}</Notice>}
      {status === "too_many_attempts" && (
        <Notice>{t("account.tooManyAttempts")}</Notice>
      )}
      {status === "expired" && <Notice>{t("account.codeExpired")}</Notice>}
      {status === "offline" && (
        <Notice icon={<WifiOff />}>
          <span>{t("account.offline")}</span>
          <Button
            type="button"
            variant="link"
            onClick={() => void submit(value)}
            className="w-fit text-sm text-error decoration-error/30 hover:text-error"
          >
            {t("account.retry")}
          </Button>
        </Notice>
      )}
      {notice === "resent" && status === "idle" && (
        <Notice tone="success" icon={<Check />}>
          {t("account.codeResent")}
        </Notice>
      )}
      {notice === "too_many" && <Notice>{t("account.tooManyCodes")}</Notice>}
      {notice === "send_offline" && (
        <Notice icon={<WifiOff />}>{t("account.offline")}</Notice>
      )}
      {!dead && notice === null && now - sentAt >= SPAM_HINT_MS && (
        <Notice tone="neutral" icon={<Mail />}>
          <span className="font-medium">{t("account.notReceivedTitle")}</span>
          <span className="text-on-surface-variant">
            {t("account.notReceivedBody", { sender: CODE_SENDER })}
          </span>
        </Notice>
      )}

      {dead ? (
        <Button
          type="button"
          className="h-11 w-full gap-2"
          onClick={() => void resend()}
          disabled={sending}
        >
          {sending && (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          )}
          {t("account.newCode")}
        </Button>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="auto"
          disabled={cooldown > 0 || sending}
          onClick={() => void resend()}
          className="mx-auto text-sm tabular-nums"
        >
          {cooldown > 0
            ? t("account.resendIn", { time: formatCountdown(cooldown / 1000) })
            : t("account.resend")}
        </Button>
      )}
    </div>
  );
}
