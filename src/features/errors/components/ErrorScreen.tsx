import { DisplayHeader } from "@/components/editorial/DisplayHeader";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/LocaleContext";
import type { TKey } from "@/i18n/types";

export type ErrorScreenProps =
  | { variant: "backend-down"; onRetry?: () => void }
  | { variant: "no-grid-today" }
  | { variant: "crashed"; onReset?: () => void };

type Content = {
  title: TKey;
  eyebrow: TKey;
  bodyPre: TKey;
  bodyAccent: TKey;
  bodyPost: TKey;
  cta?: TKey;
};

const PUNCTUATION_AFTER_ACCENT = /^[.,;:!?]/;

function joinPost(post: string): string {
  return PUNCTUATION_AFTER_ACCENT.test(post) ? post : ` ${post}`;
}

function getContent(variant: ErrorScreenProps["variant"]): Content {
  switch (variant) {
    case "backend-down":
      return {
        title: "errorScreen.backendDownTitle",
        eyebrow: "errorScreen.backendDownEyebrow",
        bodyPre: "errorScreen.backendDownBodyPre",
        bodyAccent: "errorScreen.backendDownBodyAccent",
        bodyPost: "errorScreen.backendDownBodyPost",
        cta: "errorScreen.backendDownCta",
      };
    case "no-grid-today":
      return {
        title: "errorScreen.noGridTodayTitle",
        eyebrow: "errorScreen.noGridTodayEyebrow",
        bodyPre: "errorScreen.noGridTodayBodyPre",
        bodyAccent: "errorScreen.noGridTodayBodyAccent",
        bodyPost: "errorScreen.noGridTodayBodyPost",
      };
    case "crashed":
      return {
        title: "errorScreen.crashedTitle",
        eyebrow: "errorScreen.crashedEyebrow",
        bodyPre: "errorScreen.crashedBodyPre",
        bodyAccent: "errorScreen.crashedBodyAccent",
        bodyPost: "errorScreen.crashedBodyPost",
        cta: "errorScreen.crashedCta",
      };
  }
}

export function ErrorScreen(props: ErrorScreenProps) {
  const t = useT();
  const content = getContent(props.variant);

  function handleCta() {
    if (props.variant === "backend-down") {
      if (props.onRetry) props.onRetry();
      else window.location.reload();
    } else if (props.variant === "crashed") {
      if (props.onReset) props.onReset();
      else window.location.reload();
    }
  }

  return (
    <section
      role="alert"
      aria-live="polite"
      className="flex flex-col items-center justify-center py-12 text-center gap-5"
    >
      <DisplayHeader
        as="h2"
        size="lg"
        centered
        title={t(content.title)}
        eyebrow={t(content.eyebrow)}
      />
      <p className="max-w-[360px] text-sm leading-relaxed text-on-surface-variant">
        {t(content.bodyPre)}{" "}
        <span className="font-medium text-brand">{t(content.bodyAccent)}</span>
        {joinPost(t(content.bodyPost))}
      </p>
      {content.cta ? (
        <Button type="button" onClick={handleCta} size="lg">
          {t(content.cta)}
        </Button>
      ) : null}
    </section>
  );
}
