import { usePostHog } from "@posthog/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { loadHistory } from "@/features/game/logic/history";
import { useLocale } from "@/i18n/LocaleContext";
import { authClient } from "@/lib/authClient";
import { STORAGE_KEYS, safeRemove } from "@/lib/storage";
import { api } from "../../../convex/_generated/api";
import { chunkEntries } from "./logic/syncChunks";

export type AccountProfile = {
  email: string;
  pseudo: string | null;
  country: string | null;
};

type AccountContextValue = {
  /** `loading` tant que la session se vérifie. */
  status: "loading" | "anonymous" | "signedIn";
  /**
   * Le rattachement de la connexion est passé (réussi ou non) : la partie du
   * jour peut passer au compte (`useGameState`).
   */
  synced: boolean;
  profile: AccountProfile | null | undefined;
  /** Nouveau compte : la fenêtre de bienvenue, avec les parties rattachées. */
  welcome: { attached: number } | null;
  dismissWelcome: () => void;
  signOut: () => Promise<void>;
};

const AccountContext = createContext<AccountContextValue | null>(null);

/**
 * L'état du compte facultatif (#155), pour toute l'app. À chaque connexion,
 * les parties du journal de l'appareil passent au compte (`syncAccount`) :
 * le serveur l'emporte. La déconnexion ne laisse aucune trace du compte.
 */
export function AccountProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const posthog = usePostHog();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const syncAccount = useMutation(api.account.syncAccount);
  const profile = useQuery(api.account.me, isAuthenticated ? {} : "skip");
  const [synced, setSynced] = useState(false);
  const [welcome, setWelcome] = useState<{ attached: number } | null>(null);
  const syncingRef = useRef(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: posthog is a stable ref
  useEffect(() => {
    if (!isAuthenticated) {
      setSynced(false);
      return;
    }
    if (synced || syncingRef.current) return;
    syncingRef.current = true;
    (async () => {
      let isNew = false;
      let attached = 0;
      try {
        // Un appel par tranche : le premier crée le profil s'il manque.
        for (const entries of chunkEntries(loadHistory())) {
          const result = await syncAccount({ entries, locale });
          isNew ||= result.isNew;
          attached += result.attached;
        }
        if (isNew) {
          setWelcome({ attached });
          // Anonyme : ni identifiant ni e-mail, seulement le fait.
          posthog?.capture("account_created", { attached_games: attached });
        }
      } catch {
        // Rattachement manqué : il sera retenté à la prochaine connexion. La
        // partie du jour continue, au besoin en local seulement.
      } finally {
        syncingRef.current = false;
        setSynced(true);
      }
    })();
  }, [isAuthenticated, synced, syncAccount, locale]);

  const signOut = useCallback(async () => {
    setWelcome(null);
    await authClient.signOut();
    // Aucune trace du compte sur l'appareil, pas même une session expirée.
    safeRemove(`${STORAGE_KEYS.authPrefix}_cookie`);
    safeRemove(`${STORAGE_KEYS.authPrefix}_session_data`);
  }, []);

  const value: AccountContextValue = {
    status: isLoading ? "loading" : isAuthenticated ? "signedIn" : "anonymous",
    synced: isAuthenticated && synced,
    profile: isAuthenticated ? profile : null,
    welcome,
    dismissWelcome: () => setWelcome(null),
    signOut,
  };
  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside AccountProvider");
  return value;
}
