import { ErrorBoundary } from "@/features/errors/components/ErrorBoundary";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <LocaleProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </LocaleProvider>
    </ConvexProvider>
  );
}
