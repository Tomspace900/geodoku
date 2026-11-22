import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "@/App";
import {
  disableAnalytics,
  startAnalytics,
  watchEarlyErrors,
} from "@/app/analytics";
import { isDevHostname } from "@/app/analyticsNoise";
import { installFlagEmojiFont } from "@/app/flagEmojiFont";
import { oauthCallbackRelay } from "@/lib/convexSite";
import "@/index.css";

// Retour de Google (#155) : la page n'est qu'un relais vers Convex. Elle part
// aussitôt, avant toute mesure et tout rendu.
const relay = oauthCallbackRelay(
  window.location,
  import.meta.env.VITE_CONVEX_URL,
);
if (relay) window.location.replace(relay);

// Les previews Vercel n'ont volontairement pas de jeton, pour ne pas polluer les
// stats : sans PostHog, chaque appel de la façade est un no-op. Même règle en
// local, jeton présent ou non. posthog-js n'arrive qu'après le rendu (#180).
const posthogToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
const analyticsOn =
  !relay && !!posthogToken && !isDevHostname(window.location.hostname);
if (analyticsOn) watchEarlyErrors();
else disableAnalytics();

if (!relay) {
  installFlagEmojiFont();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
  if (analyticsOn && posthogToken) {
    startAnalytics({
      token: posthogToken,
      apiHost: import.meta.env.VITE_POSTHOG_HOST,
    });
  }
}
