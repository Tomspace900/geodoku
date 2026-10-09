import { defineAbout } from "../defineAbout";

export default defineAbout("nature_mountain_area_majority", {
  sources: ["un_sdg_mountain_area"],
  basis: "convention",
  clarification: {
    fr: "Part du territoire classée montagneuse (série « aire montagneuse » de l'ODD 15.4.2). Quatre pays absents de la série ont une valeur curée.",
    en: "Share of territory classed as mountain (SDG 15.4.2 'mountain area' series). Four countries missing from the series have a curated value.",
  },
});
