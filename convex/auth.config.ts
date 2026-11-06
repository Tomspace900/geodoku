import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

/** Les JWT de Better Auth (#155), signés et servis par ce déploiement. */
export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
