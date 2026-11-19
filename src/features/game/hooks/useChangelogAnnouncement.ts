import { usePostHog } from "@posthog/react";
import { useEffect, useRef, useState } from "react";
import { useAccount } from "@/features/account/AccountContext";
import {
  type ChangelogEntry,
  getPendingAnnouncement,
} from "@/features/legal/logic/changelog";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

export type AnnouncementCloseAction = "dismiss" | "cta" | "account" | "target";

function resolveInitialAnnouncement(): ChangelogEntry | null {
  if (typeof window === "undefined") return null;
  return getPendingAnnouncement({
    seenVersion: safeGet(STORAGE_KEYS.changelogSeen),
  });
}

export function useChangelogAnnouncement(enabled: boolean) {
  const posthog = usePostHog();
  const [pending, setPending] = useState<ChangelogEntry | null>(
    resolveInitialAnnouncement,
  );
  const shownCapturedRef = useRef(false);
  const accountStatus = useAccount().status;

  // Une annonce qui invite à créer un compte attend de savoir que le joueur
  // n'en a pas, et ne s'affiche jamais à un joueur connecté.
  const waitsForAnonymous =
    pending?.announcement?.accountCtaLabel !== undefined &&
    accountStatus !== "anonymous";
  const active = enabled && !waitsForAnonymous ? pending : null;

  useEffect(() => {
    if (!active?.announcement || shownCapturedRef.current) return;
    shownCapturedRef.current = true;
    posthog?.capture("changelog_announcement_shown", {
      version: active.version,
      kind: active.announcement.kind,
    });
  }, [active, posthog]);

  function dismiss(action: AnnouncementCloseAction) {
    if (!pending) return;
    safeSet(STORAGE_KEYS.changelogSeen, pending.version);
    if (pending.announcement) {
      posthog?.capture("changelog_announcement_closed", {
        version: pending.version,
        kind: pending.announcement.kind,
        action,
      });
    }
    setPending(null);
  }

  return { active, dismiss };
}
