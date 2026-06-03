import { Providers } from "@/app/providers";
import { useDailyReload } from "@/app/useDailyReload";
import { AdminPage } from "@/features/admin/AdminPage";
import { GamePage } from "@/features/game/components/GamePage";

const KNOWN_PATHS = new Set(["/", "/admin"]);

function App() {
  useDailyReload();
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

  return (
    <Providers>
      <GamePage />
    </Providers>
  );
}

export default App;
