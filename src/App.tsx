import { Providers } from "@/app/providers";
import { AdminPage } from "@/features/admin/AdminPage";

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
      <div className="flex min-h-screen items-center justify-center">
        <h1 className="text-4xl font-bold">Geodoku</h1>
      </div>
    </Providers>
  );
}

export default App;
