import { defineAbout } from "../defineAbout";

export default defineAbout("continent_europe", {
  sources: ["world_countries", "un_m49"],
  basis: "convention",
  clarification: {
    fr: "Découpage Geodoku, proche de la nomenclature de l'ONU ; un pays à cheval sur deux continents n'est compté que dans un seul.",
    en: "Geodoku's own split, close to the UN nomenclature; a country spanning two continents counts for only one of them.",
  },
});
