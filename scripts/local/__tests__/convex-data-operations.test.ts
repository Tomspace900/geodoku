import { describe, expect, test } from "vitest";
import {
  buildCopyCommands,
  requirePersonalDevDeployment,
} from "../convex-data-operations";

const EMPTY = "/tmp/empty.jsonl";

describe("buildCopyCommands", () => {
  test("copie la production vers le cloud dev personnel", () => {
    expect(buildCopyCommands("prod-to-dev", "/tmp/geodoku.zip", EMPTY)).toEqual(
      {
        exportArgs: ["export", "--prod", "--path", "/tmp/geodoku.zip"],
        importArgs: ["import", "--replace-all", "-y", "/tmp/geodoku.zip"],
        clearSigningKeysArgs: [
          "import",
          "--component",
          "betterAuth",
          "--table",
          "jwks",
          "--replace",
          "-y",
          EMPTY,
        ],
        requiresDevelopConfirmation: false,
        requiresPersonalDevTarget: true,
      },
    );
  });

  test("copie develop vers le cloud dev personnel", () => {
    expect(
      buildCopyCommands("develop-to-dev", "/tmp/geodoku.zip", EMPTY),
    ).toEqual({
      exportArgs: [
        "export",
        "--preview-name",
        "develop",
        "--path",
        "/tmp/geodoku.zip",
      ],
      importArgs: ["import", "--replace-all", "-y", "/tmp/geodoku.zip"],
      clearSigningKeysArgs: [
        "import",
        "--component",
        "betterAuth",
        "--table",
        "jwks",
        "--replace",
        "-y",
        EMPTY,
      ],
      requiresDevelopConfirmation: false,
      requiresPersonalDevTarget: true,
    });
  });

  test("rend la copie production vers develop explicite", () => {
    expect(
      buildCopyCommands("prod-to-develop", "/tmp/geodoku.zip", EMPTY),
    ).toEqual({
      exportArgs: ["export", "--prod", "--path", "/tmp/geodoku.zip"],
      importArgs: [
        "import",
        "--preview-name",
        "develop",
        "--replace-all",
        "-y",
        "/tmp/geodoku.zip",
      ],
      clearSigningKeysArgs: [
        "import",
        "--preview-name",
        "develop",
        "--component",
        "betterAuth",
        "--table",
        "jwks",
        "--replace",
        "-y",
        EMPTY,
      ],
      requiresDevelopConfirmation: true,
      requiresPersonalDevTarget: false,
    });
  });
});

describe("requirePersonalDevDeployment", () => {
  test("accepte uniquement un déploiement dev personnel", () => {
    expect(requirePersonalDevDeployment("dev:careful-otter")).toBe(
      "dev:careful-otter",
    );
  });

  test.each([undefined, "", "prod:geodoku", "preview:develop"])(
    "rejette la cible %s",
    (deployment) => {
      expect(() => requirePersonalDevDeployment(deployment)).toThrow(
        "cloud dev personnel",
      );
    },
  );
});
