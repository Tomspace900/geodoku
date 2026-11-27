import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import viteConfig from "../../vite.config.ts";
import { vercelHeadersForHost } from "./vercelHeaders.ts";

const VERCEL_CONFIG = JSON.parse(
  readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
);

const entry = (
  headers: Record<string, string>,
  conditions: { has?: string; missing?: string } = {},
) => ({
  source: "/(.*)",
  ...(conditions.has ? { has: [{ type: "host", value: conditions.has }] } : {}),
  ...(conditions.missing
    ? { missing: [{ type: "host", value: conditions.missing }] }
    : {}),
  headers: Object.entries(headers).map(([key, value]) => ({ key, value })),
});

describe("vercelHeadersForHost", () => {
  it("prend les entrées sans condition et celles dont l'hôte correspond", () => {
    const config = {
      headers: [
        entry({ A: "prod" }, { has: "www.geodoku.app" }),
        entry({ A: "ailleurs" }, { missing: "www.geodoku.app" }),
        entry({ B: "partout" }),
      ],
    };
    expect(vercelHeadersForHost(config, "localhost")).toEqual({
      A: "ailleurs",
      B: "partout",
    });
  });

  it("ignore une entrée à une condition autre que l'hôte", () => {
    const config = {
      headers: [
        {
          source: "/(.*)",
          has: [{ type: "cookie", value: "x" }],
          headers: [{ key: "A", value: "1" }],
        },
      ],
    };
    expect(vercelHeadersForHost(config, "localhost")).toEqual({});
  });

  it("sert à l'e2e la CSP bloquante de develop, sans le point de collecte de la prod", () => {
    const headers = vercelHeadersForHost(VERCEL_CONFIG, "localhost");
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).not.toContain("report-uri");
    expect(headers["Content-Security-Policy-Report-Only"]).toBeUndefined();
  });

  it("est servi par vite preview, sur lequel tourne l'e2e de la CI", () => {
    expect(viteConfig.preview?.headers).toEqual(
      vercelHeadersForHost(VERCEL_CONFIG, "localhost"),
    );
  });

  it("garde X-Frame-Options à côté de frame-ancestors", () => {
    const headers = vercelHeadersForHost(VERCEL_CONFIG, "www.geodoku.app");
    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
  });
});
