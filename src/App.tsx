import { lazy, Suspense, useEffect, useLayoutEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { pageMeta } from "@/app/pageMeta";
import { Providers } from "@/app/providers";
import { useFreshBundle } from "@/app/useFreshBundle";
import { GamePage } from "@/features/game/GamePage";
import { AboutPage } from "@/features/legal/AboutPage";
import { ChangelogPage } from "@/features/legal/ChangelogPage";
import { PrivacyPage } from "@/features/legal/PrivacyPage";
import { LocaleSuggestionToast } from "@/i18n/components/LocaleSuggestionToast";
import { useLocale, useT } from "@/i18n/LocaleContext";
import {
  LOCALES,
  localeFromPath,
  localizePath,
  preferredLocale,
  stripLocale,
} from "@/i18n/localePath";

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

function RouteAnnouncer({ pathname: localizedPathname }: { pathname: string }) {
  const t = useT();
  const pathname = stripLocale(localizedPathname);
  const label =
    pathname === "/about"
      ? t("footer.about")
      : pathname === "/privacy"
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

/**
 * La racine et les adresses inconnues mènent à l'accueil : celui de la langue
 * de l'adresse (`/en/inconnue` → `/en`), sinon celui du visiteur. En prod, le
 * middleware Vercel redirige déjà `/` ; ce repli sert au dev et au gabarit 404.
 */
function HomeRedirect() {
  const { pathname } = useLocation();
  const { storedLocale } = useLocale();
  const locale =
    localeFromPath(pathname) ??
    preferredLocale({ storedLocale, languages: navigator.languages ?? [] });
  return <Navigate to={localizePath("/", locale)} replace />;
}

function AppRoutes() {
  const location = useLocation();
  const normalizedPath = normalizePath(location.pathname);

  // Le titre suit la page et la langue en navigation interne ; le pré-rendu
  // le pose déjà dans le HTML servi (#140).
  useEffect(() => {
    document.title = pageMeta(normalizedPath).title;
  }, [normalizedPath]);

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
        {/* Chaque page existe dans chaque langue : `/fr/privacy`, `/en/privacy` (#140). */}
        {LOCALES.flatMap((locale) => [
          <Route
            key={`${locale}-home`}
            path={localizePath("/", locale)}
            element={<GamePage />}
          />,
          <Route
            key={`${locale}-about`}
            path={localizePath("/about", locale)}
            element={<AboutPage />}
          />,
          <Route
            key={`${locale}-privacy`}
            path={localizePath("/privacy", locale)}
            element={<PrivacyPage />}
          />,
          <Route
            key={`${locale}-changelog`}
            path={localizePath("/changelog", locale)}
            element={<ChangelogPage />}
          />,
          <Route
            key={`${locale}-archive`}
            path={localizePath("/archive", locale)}
            element={
              <Suspense fallback={<RouteLoading />}>
                <ArchivePage />
              </Suspense>
            }
          />,
          <Route
            key={`${locale}-training`}
            path={localizePath("/archive/:date", locale)}
            element={
              <Suspense fallback={<RouteLoading />}>
                <TrainingPage />
              </Suspense>
            }
          />,
        ])}
        <Route
          path="/admin"
          element={
            <Suspense fallback={<RouteLoading />}>
              <AdminPage />
            </Suspense>
          }
        />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
      <LocaleSuggestionToast />
    </>
  );
}

function App() {
  useFreshBundle();
  const location = useLocation();

  return (
    // Clé sans langue : passer de `/fr` à `/en` ne remonte pas la page en cours.
    <Providers errorBoundaryKey={stripLocale(normalizePath(location.pathname))}>
      <AppRoutes />
    </Providers>
  );
}

export default App;
