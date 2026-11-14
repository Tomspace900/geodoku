import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { emailOTPClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { convexSiteUrl } from "@/lib/convexSite";
import { STORAGE_KEYS, safeGet, safeSet } from "@/lib/storage";

/**
 * La page et Convex n'ont pas le même domaine : Better Auth garde sa session
 * dans le stockage du navigateur (plugin cross-domain), sous nos clés.
 */
const authStorage = {
  getItem: (key: string) => safeGet(key),
  setItem: (key: string, value: string) => {
    safeSet(key, value);
  },
};

export const authClient = createAuthClient({
  baseURL: import.meta.env.SSR
    ? "https://prerender.invalid"
    : convexSiteUrl(import.meta.env.VITE_CONVEX_URL),
  plugins: [
    convexClient(),
    crossDomainClient({
      storage: authStorage,
      storagePrefix: STORAGE_KEYS.authPrefix,
    }),
    emailOTPClient(),
  ],
});
