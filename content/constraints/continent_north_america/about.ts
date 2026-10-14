import { defineAbout } from "../defineAbout";

export default defineAbout("continent_north_america", {
  sources: ["world_countries", "un_m49"],
  basis: "convention",
  clarification: {
    fr: "Comprend l'Amérique centrale et les Caraïbes. Un pays qui s'étend sur deux continents n'est rattaché qu'à un seul.",
    en: "Includes Central America and the Caribbean. A country spanning two continents is assigned to only one of them.",
  },
});
