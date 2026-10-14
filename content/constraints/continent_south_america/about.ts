import { defineAbout } from "../defineAbout";

export default defineAbout("continent_south_america", {
  sources: ["world_countries", "un_m49"],
  basis: "convention",
  clarification: {
    fr: "Chaque pays transcontinental est rattaché à un seul continent (territoires d'outre-mer exclus).",
    en: "Each transcontinental country is assigned to a single continent (overseas territories excluded).",
  },
});
