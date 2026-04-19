import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorScreen } from "./ErrorScreen";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Geodoku] Uncaught render error", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center bg-surface px-4 py-6">
          <div className="flex w-full max-w-[500px] flex-col">
            <ErrorScreen variant="crashed" />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
