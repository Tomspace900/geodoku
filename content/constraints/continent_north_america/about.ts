import { defineAbout } from "../defineAbout";

export default defineAbout("continent_north_america", {
  sources: ["un_m49"],
  basis: "convention",
  clarification: {
    fr: "Amérique centrale et Caraïbes comprises ; un pays à cheval sur deux continents n'est compté que dans un seul.",
    en: "Central America and the Caribbean included; a country spanning two continents counts for only one of them.",
  },
});
