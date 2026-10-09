import { defineAbout } from "../defineAbout";

export default defineAbout("physical_mediterranean_coast", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Au moins une côte sur la Méditerranée elle-même (limites de l'IHO) ; liste établie à la main, pays par pays.",
    en: "At least one coast on the Mediterranean itself (IHO limits); list compiled by hand, country by country.",
  },
});
