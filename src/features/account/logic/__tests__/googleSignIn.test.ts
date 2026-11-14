import { beforeEach, describe, expect, it } from "vitest";
import {
  forgetGoogleSignIn,
  markGoogleSignIn,
  takeGoogleSignIn,
} from "../googleSignIn";

describe("googleSignIn — marque de connexion Google", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("se lit une seule fois au retour de Google", () => {
    markGoogleSignIn();
    expect([takeGoogleSignIn(), takeGoogleSignIn()]).toEqual([true, false]);
  });

  it("ne survit pas à un parcours repris par e-mail", () => {
    markGoogleSignIn();
    forgetGoogleSignIn();
    expect(takeGoogleSignIn()).toBe(false);
  });
});
