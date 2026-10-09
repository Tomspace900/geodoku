import { defineAbout } from "../defineAbout";

export default defineAbout("nature_rainforest", {
  sources: ["nasa_modis_mcd12q1"],
  basis: "convention",
  clarification: {
    fr: "Liste établie à la main, biome par biome ; la couverture du sol MODIS ne sert que de repère.",
    en: "List compiled by hand, biome by biome; MODIS land cover is only a reference.",
  },
});
