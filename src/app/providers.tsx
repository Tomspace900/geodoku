import { ErrorBoundary } from "@/features/errors/components/ErrorBoundary";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { Key, ReactNode } from "react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

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
