import App from "@/App";
import { PostHogProvider } from "@posthog/react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import posthog from "posthog-js";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@/index.css";

posthog.init(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN, {
  api_host: import.meta.env.VITE_POSTHOG_HOST,
  defaults: "2026-01-30",
  autocapture: false,
  // Identifiant anonyme stocké en localStorage uniquement : aucun cookie posé,
  // donc pas de bandeau de consentement requis (cf. /privacy).
  persistence: "localStorage",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <App />
      <Analytics />
      <SpeedInsights />
    </PostHogProvider>
  </StrictMode>,
);
