import { defineAbout } from "../defineAbout";

export default defineAbout("nature_rainforest", {
  sources: ["nasa_modis_mcd12q1"],
  basis: "convention",
  clarification: {
    fr: "Outre-mer intégré compris.",
    en: "Integrated overseas territories included.",
  },
});
