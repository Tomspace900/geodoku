import { defineAbout } from "../defineAbout";

export default defineAbout("continent_europe", {
  sources: ["world_countries", "un_m49"],
  basis: "convention",
  clarification: {
    fr: "Un pays à cheval sur deux continents n'est compté qu'une fois. Chypre, membre de l'UE, compte en Europe (l'ONU la classe en Asie).",
    en: "A country spanning two continents counts only once. Cyprus, an EU member, counts as European (the UN classes it in Asia).",
  },
});
