import { defineAbout } from "../defineAbout";

export default defineAbout("physical_crosses_equator", {
  sources: ["natural_earth"],
  basis: "convention",
  clarification: {
    fr: "La ligne de l'équateur doit couper les terres émergées ou traverser directement un archipel du pays.",
    en: "The equator must cross dry land or run directly through one of the country's archipelagos.",
  },
});
