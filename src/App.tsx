import { lazy, Suspense, useLayoutEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { Providers } from "@/app/providers";
import { useFreshBundle } from "@/app/useFreshBundle";
import { GamePage } from "@/features/game/GamePage";
import { ChangelogPage } from "@/features/legal/ChangelogPage";
import { PrivacyPage } from "@/features/legal/PrivacyPage";
import { useT } from "@/i18n/LocaleContext";

const AdminPage = lazy(() =>
  import("@/features/admin/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);

// Archive et entraînement : chargés en lazy, dans un chunk commun. Ils ne sont
// atteignables qu'une fois la grille du jour terminée, donc les garder hors du
// chemin critique ne coûte rien au joueur du quotidien.
const ArchivePage = lazy(() =>
  import("@/features/archive/ArchivePage").then((module) => ({
    default: module.ArchivePage,
  })),
);
const TrainingPage = lazy(() =>
  import("@/features/archive/TrainingPage").then((module) => ({
    default: module.TrainingPage,
  })),
);

function normalizePath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

function RouteLoading() {
  const t = useT();
  return (
    <output
      aria-live="polite"
      aria-busy="true"
      className="grid min-h-svh place-items-center bg-surface text-sm text-on-surface-variant"
    >
      {t("ui.loading")}
    </output>
  );
}

function RouteScrollReset() {
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return null;
}

function RouteAnnouncer({ pathname }: { pathname: string }) {
  const t = useT();
  const label =
    pathname === "/privacy"
      ? t("footer.privacy")
      : pathname === "/changelog"
        ? t("footer.changelog")
        : pathname === "/admin"
          ? "Administration"
          : pathname.startsWith("/archive")
            ? t("archive.title")
            : t("ui.appName");

  return (
    <output
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-route-announcer
    >
      {label}
    </output>
  );
}

function AppRoutes() {
  const location = useLocation();
  const normalizedPath = normalizePath(location.pathname);

  if (normalizedPath !== location.pathname) {
    return (
      <Navigate
        to={{
          pathname: normalizedPath,
          search: location.search,
          hash: location.hash,
        }}
        replace
      />
    );
  }

  return (
    <>
      <RouteScrollReset key={normalizedPath} />
      <RouteAnnouncer pathname={normalizedPath} />
      <Routes>
        <Route path="/" element={<GamePage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route
          path="/archive"
          element={
            <Suspense fallback={<RouteLoading />}>
              <ArchivePage />
            </Suspense>
          }
        />
        <Route
          path="/archive/:date"
          element={
            <Suspense fallback={<RouteLoading />}>
              <TrainingPage />
            </Suspense>
          }
        />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<RouteLoading />}>
              <AdminPage />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function App() {
  useFreshBundle();
  const location = useLocation();

  return (
    <Providers errorBoundaryKey={normalizePath(location.pathname)}>
      <AppRoutes />
    </Providers>
  );
}

export default App;
