import {
  type AuthClient,
  ConvexBetterAuthProvider,
} from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import type { Key, ReactNode } from "react";
import { AccountProvider } from "@/features/account/AccountContext";
import { ErrorBoundary } from "@/features/errors/components/ErrorBoundary";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { authClient } from "@/lib/authClient";

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

// Les types du fournisseur ne connaissent pas le plugin `emailOTP` : le
// client reste celui de Better Auth, seul son type est élargi.
const providerAuthClient = authClient as unknown as AuthClient;

type Props = {
  children: ReactNode;
  errorBoundaryKey: Key;
};

/**
 * Le client Convex porte la session du compte facultatif (#155) : un joueur
 * sans compte joue exactement comme avant, ses requêtes partent sans jeton.
 */
export function Providers({ children, errorBoundaryKey }: Props) {
  return (
    <ConvexBetterAuthProvider client={convex} authClient={providerAuthClient}>
      <LocaleProvider>
        <AccountProvider>
          <ErrorBoundary key={errorBoundaryKey}>{children}</ErrorBoundary>
        </AccountProvider>
      </LocaleProvider>
    </ConvexBetterAuthProvider>
  );
}
