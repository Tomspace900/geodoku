import { Providers } from "@/app/providers";
import { AdminPage } from "@/features/admin/AdminPage";
import { GamePage } from "@/features/game/components/GamePage";

function App() {
  if (window.location.pathname === "/admin") {
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
