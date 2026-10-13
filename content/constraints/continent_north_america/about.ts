import { defineAbout } from "../defineAbout";

export default defineAbout("continent_north_america", {
  sources: ["world_countries", "un_m49"],
  basis: "convention",
  clarification: {
    fr: "Comprend l'Amérique centrale et les Caraïbes.",
    en: "Includes Central America and the Caribbean.",
  },
});
