import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_atlantic", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Façade océanique directe (mers semi-fermées comme la Méditerranée ou la mer des Caraïbes exclues).",
    en: "Direct ocean coastline (semi-enclosed seas such as the Mediterranean or the Caribbean Sea excluded).",
  },
});
