import { useEffect, useRef } from "react";
import { type Analytics, useAnalytics } from "@/app/analytics";

export type LegalAnalyticsPage = "privacy" | "changelog" | "about";

const READ_SCROLL_THRESHOLD_PERCENT = 80;

function captureLegalPageLeft(
  analytics: Analytics,
  page: LegalAnalyticsPage,
  openedAt: number,
  maxScrollPercent: number,
) {
  analytics.capture("legal_page_left", {
    page,
    duration_ms: Date.now() - openedAt,
    max_scroll_percent: maxScrollPercent,
    read: maxScrollPercent >= READ_SCROLL_THRESHOLD_PERCENT,
  });
}

export function useLegalPageAnalytics(page: LegalAnalyticsPage) {
  const analytics = useAnalytics();
  const openedAtRef = useRef(Date.now());
  const maxScrollRef = useRef(0);
  const leftCapturedRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: analytics is a stable ref
  useEffect(() => {
    leftCapturedRef.current = false;
    openedAtRef.current = Date.now();
    maxScrollRef.current = 0;
    analytics.capture("legal_page_viewed", { page });

    function updateScroll() {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight <= 0) {
        maxScrollRef.current = 100;
        return;
      }
      const percent = Math.round((window.scrollY / scrollHeight) * 100);
      maxScrollRef.current = Math.max(maxScrollRef.current, percent);
    }

    function leaveOnce() {
      if (leftCapturedRef.current) return;
      leftCapturedRef.current = true;
      captureLegalPageLeft(
        analytics,
        page,
        openedAtRef.current,
        maxScrollRef.current,
      );
    }

    window.addEventListener("scroll", updateScroll, { passive: true });
    updateScroll();

    function onVisibilityChange() {
      if (document.visibilityState === "hidden") leaveOnce();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("scroll", updateScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      leaveOnce();
    };
  }, [page]);
}
