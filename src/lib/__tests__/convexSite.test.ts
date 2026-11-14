import { describe, expect, it } from "vitest";
import { convexSiteUrl, oauthCallbackRelay } from "../convexSite";

const CLOUD = "https://calm-otter-1.eu-west-1.convex.cloud";

describe("convexSiteUrl", () => {
  it("passe de l'adresse des fonctions à celle des routes HTTP", () => {
    expect(convexSiteUrl(CLOUD)).toBe(
      "https://calm-otter-1.eu-west-1.convex.site",
    );
  });
});

describe("oauthCallbackRelay", () => {
  it("relaie le retour de Google vers Convex, requête comprise", () => {
    expect(
      oauthCallbackRelay(
        { pathname: "/api/auth/callback/google", search: "?state=a&code=b" },
        CLOUD,
      ),
    ).toBe(
      "https://calm-otter-1.eu-west-1.convex.site/api/auth/callback/google?state=a&code=b",
    );
  });

  it("ne touche à aucune autre page", () => {
    expect(
      oauthCallbackRelay({ pathname: "/fr/stats", search: "" }, CLOUD),
    ).toBe(null);
  });
});
