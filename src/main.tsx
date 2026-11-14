import { PostHogProvider } from "@posthog/react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import posthog from "posthog-js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "@/App";
import { dropNoiseExceptions, isDevHostname } from "@/app/analyticsNoise";
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
// stats : sans init, chaque appel posthog est un no-op, sans l'erreur de console
// qu'un init à jeton vide déclenche. Même règle en local, jeton présent ou non.
const posthogToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN?.trim();
if (!relay && posthogToken && !isDevHostname(window.location.hostname)) {
  posthog.init(posthogToken, {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    defaults: "2026-01-30",
    autocapture: false,
    // Identifiant anonyme stocké en localStorage uniquement : aucun cookie posé,
    // donc pas de bandeau de consentement requis (cf. /privacy).
    persistence: "localStorage",
    before_send: dropNoiseExceptions,
  });
}

if (!relay) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <PostHogProvider client={posthog}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
        <Analytics />
        <SpeedInsights />
      </PostHogProvider>
    </StrictMode>,
  );
}
