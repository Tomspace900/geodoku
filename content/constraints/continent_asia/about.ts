import { defineAbout } from "../defineAbout";

export default defineAbout("continent_asia", {
  sources: ["world_countries", "un_m49"],
  basis: "convention",
  clarification: {
    fr: "Un pays à cheval sur deux continents n'est compté qu'une fois. Chypre, classée en Asie par l'ONU, compte ici en Europe.",
    en: "A country spanning two continents counts only once. Cyprus, which the UN places in Asia, counts as European here.",
  },
});
