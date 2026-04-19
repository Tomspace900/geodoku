import { LocaleProvider } from "@/i18n/LocaleContext";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { ErrorScreen } from "../ErrorScreen";

function renderWithLocale(ui: ReactElement) {
  return render(<LocaleProvider>{ui}</LocaleProvider>);
}

describe("ErrorScreen", () => {
  it("renders the backend-down variant with a retry CTA", () => {
    const onRetry = vi.fn();
    renderWithLocale(<ErrorScreen variant="backend-down" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/petit imprévu|hiccup/i)).toBeTruthy();
    expect(screen.getByText(/connexion perdue|connection lost/i)).toBeTruthy();

    const cta = screen.getByRole("button", { name: /réessayer|try again/i });
    fireEvent.click(cta);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders the no-grid-today variant without a CTA", () => {
    renderWithLocale(<ErrorScreen variant="no-grid-today" />);

    expect(screen.getByText(/pas de grille|no grid today/i)).toBeTruthy();
    expect(screen.getByText(/jour blanc|blank day/i)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the crashed variant with a reset CTA", () => {
    const onReset = vi.fn();
    renderWithLocale(<ErrorScreen variant="crashed" onReset={onReset} />);

    expect(screen.getByText(/quelque chose|something broke/i)).toBeTruthy();
    expect(
      screen.getByText(/erreur inattendue|unexpected error/i),
    ).toBeTruthy();

    const cta = screen.getByRole("button", {
      name: /recharger|reload/i,
    });
    fireEvent.click(cta);
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
