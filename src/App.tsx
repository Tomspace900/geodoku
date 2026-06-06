import { Providers } from "@/app/providers";
import { useFreshBundle } from "@/app/useFreshBundle";
import { AdminPage } from "@/features/admin/AdminPage";
import { GamePage } from "@/features/game/components/GamePage";
import { ChangelogPage } from "@/features/legal/ChangelogPage";
import { PrivacyPage } from "@/features/legal/PrivacyPage";

const KNOWN_PATHS = new Set(["/", "/admin", "/privacy", "/changelog"]);

function App() {
  useFreshBundle();
  const path = window.location.pathname;

  if (!KNOWN_PATHS.has(path)) {
    window.location.replace("/");
    return null;
  }

  if (path === "/admin") {
    return (
      <Providers>
        <AdminPage />
      </Providers>
    );
  }

  if (path === "/privacy") {
    return (
      <Providers>
        <PrivacyPage />
      </Providers>
    );
  }

  if (path === "/changelog") {
    return (
      <Providers>
        <ChangelogPage />
      </Providers>
    );
  }

  return (
    <Providers>
      <GamePage />
    </Providers>
  );
}

export default App;
