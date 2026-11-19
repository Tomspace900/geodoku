import { usePostHog } from "@posthog/react";
import { useEffect, useRef, useState } from "react";
import {
  type ChangelogEntry,
  getPendingAnnouncement,
  LATEST_CHANGELOG_VERSION,
} from "@/features/legal/logic/changelog";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

export type AnnouncementCloseAction = "dismiss" | "cta" | "target";

function resolveInitialAnnouncement(): ChangelogEntry | null {
  if (typeof window === "undefined") return null;
  const isFirstVisit = safeGet(STORAGE_KEYS.howToPlay) !== "false";
  if (isFirstVisit) {
    // Un tout nouveau joueur découvre le jeu tel qu'il est : on mémorise la
    // version courante pour ne pas l'interrompre le lendemain avec une
    // nouveauté qui existait déjà à son arrivée.
    safeSet(STORAGE_KEYS.changelogSeen, LATEST_CHANGELOG_VERSION);
    return null;
  }
  return getPendingAnnouncement({
    seenVersion: safeGet(STORAGE_KEYS.changelogSeen),
    isFirstVisit: false,
  });
}

export function useChangelogAnnouncement(enabled: boolean) {
  const posthog = usePostHog();
  const [pending, setPending] = useState<ChangelogEntry | null>(
    resolveInitialAnnouncement,
  );
  const shownCapturedRef = useRef(false);

  const active = enabled ? pending : null;

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
