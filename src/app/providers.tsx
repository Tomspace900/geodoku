import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { Key, ReactNode } from "react";
import { ErrorBoundary } from "@/features/errors/components/ErrorBoundary";
import { LocaleProvider } from "@/i18n/LocaleContext";

/**
 * Sous Node (pré-rendu, #139), le client reçoit une adresse factice : il ne se
 * connecte qu'à la première souscription à une requête, qui n'a jamais lieu au
 * pré-rendu (les `useQuery` y restent en chargement). Le build n'a donc besoin
 * ni du réseau ni de `VITE_CONVEX_URL`, absente du job `quality` de la CI.
 * `.invalid` est un domaine réservé, qui ne résout jamais.
 */
const convex = import.meta.env.SSR
  ? new ConvexReactClient("https://prerender.invalid", {
      skipConvexDeploymentUrlCheck: true,
    })
  : new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

type Props = {
  children: ReactNode;
  errorBoundaryKey: Key;
};

export function Providers({ children, errorBoundaryKey }: Props) {
  return (
    <ConvexProvider client={convex}>
      <LocaleProvider>
        <ErrorBoundary key={errorBoundaryKey}>{children}</ErrorBoundary>
      </LocaleProvider>
    </ConvexProvider>
  );
}
