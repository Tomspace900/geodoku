import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  onUnauthorized: () => void;
  children: ReactNode;
};

type State = { unauthorized: boolean };

/**
 * Catches "Unauthorized" errors thrown by admin queries (invalid token in
 * Convex) and triggers a logout instead of crashing the whole app. Other
 * errors are re-thrown to bubble up to the global ErrorBoundary.
 */
export class AdminAuthBoundary extends Component<Props, State> {
  state: State = { unauthorized: false };

  static getDerivedStateFromError(error: unknown): State | null {
    if (isUnauthorized(error)) return { unauthorized: true };
    return null;
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (isUnauthorized(error)) {
      this.props.onUnauthorized();
      return;
    }
    throw error;
  }

  render() {
    if (this.state.unauthorized) return null;
    return this.props.children;
  }
}

function isUnauthorized(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes("Unauthorized");
}
