import { defineAbout } from "../defineAbout";

export default defineAbout("nature_mountain_area_majority", {
  sources: ["un_sdg_mountain_area"],
  basis: "source",
  clarification: {
    fr: "Part de superficie terrestre classée montagneuse selon la méthode ODD 15.4.2 (altitude, pente, relief).",
    en: "Share of land area classed as mountainous under the SDG 15.4.2 method (altitude, slope, relief).",
  },
});
