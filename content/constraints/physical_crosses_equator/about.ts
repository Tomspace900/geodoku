import { defineAbout } from "../defineAbout";

export default defineAbout("physical_crosses_equator", {
  sources: ["natural_earth"],
  basis: "convention",
  clarification: {
    fr: "Le critère porte sur le territoire traversé par la ligne, pas seulement sur son centre.",
    en: "The criterion covers the territory crossed by the line, not just the country's centre.",
  },
});
