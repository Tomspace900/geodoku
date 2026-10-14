import { describe, expect, it } from "vitest";
import { SOURCES } from "../../content/sources";
import { validateSourceVintages } from "./validateSourceVintages";

describe("validateSourceVintages", () => {
  it("accepte un millésime égal à celui de la récolte", () => {
    expect(
      validateSourceVintages(SOURCES, {
        undp_hdr: SOURCES.undp_hdr.vintage,
      }),
    ).toEqual([]);
  });

  it("signale un millésime resté sur la récolte précédente", () => {
    expect(
      validateSourceVintages(SOURCES, {
        undp_hdr: {
          fr: "Rapport 2023, données 2021",
          en: "2023 Report, 2021 data",
        },
      }),
    ).toEqual([expect.stringContaining("sources.undp_hdr")]);
  });

  it("signale une source récoltée sans millésime", () => {
    expect(
      validateSourceVintages(
        { ...SOURCES, undp_hdr: { ...SOURCES.undp_hdr, vintage: null } },
        { undp_hdr: { fr: "2024", en: "2024" } },
      ),
    ).toHaveLength(1);
  });
});
