import { defineAbout } from "../defineAbout";

export default defineAbout("continent_africa", {
  sources: ["world_countries", "un_m49"],
  basis: "convention",
  clarification: {
    fr: "Un pays qui s'étend sur deux continents n'est rattaché qu'à un seul.",
    en: "A country spanning two continents is assigned to only one of them.",
  },
});
