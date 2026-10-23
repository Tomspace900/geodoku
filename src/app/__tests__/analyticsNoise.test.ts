import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { dropNoiseExceptions, isDevHostname } from "../analyticsNoise";

function exception(
  value: string,
  filenames: string[] = ["https://www.geodoku.app/assets/index.js"],
): CaptureResult {
  return {
    uuid: "test",
    event: "$exception",
    properties: {
      $exception_list: [
        {
          type: "Error",
          value,
          stacktrace: { frames: filenames.map((filename) => ({ filename })) },
        },
      ],
    },
  };
}

describe("isDevHostname", () => {
  it("reconnaît le serveur de dev local", () => {
    expect(isDevHostname("localhost")).toBe(true);
  });

  it("reconnaît un sous-domaine .localhost", () => {
    expect(isDevHostname("app.localhost")).toBe(true);
  });

  it("laisse passer le domaine de prod", () => {
    expect(isDevHostname("www.geodoku.app")).toBe(false);
  });
});

describe("dropNoiseExceptions", () => {
  it("jette une erreur masquée d'un autre domaine", () => {
    expect(dropNoiseExceptions(exception("Script error."))).toBeNull();
  });

  it("jette l'avertissement ResizeObserver", () => {
    expect(
      dropNoiseExceptions(
        exception(
          "ResizeObserver loop completed with undelivered notifications.",
        ),
      ),
    ).toBeNull();
  });

  it("jette une erreur levée depuis une extension", () => {
    expect(
      dropNoiseExceptions(
        exception("boom", ["chrome-extension://abc/content.js"]),
      ),
    ).toBeNull();
  });

  it("garde une vraie erreur de l'app", () => {
    const event = exception("useLocale must be used inside LocaleProvider");
    expect(dropNoiseExceptions(event)).toBe(event);
  });

  it("ne touche pas aux autres events", () => {
    const event: CaptureResult = {
      uuid: "test",
      event: "game_completed",
      properties: {},
    };
    expect(dropNoiseExceptions(event)).toBe(event);
  });
});
