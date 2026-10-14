import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_atlantic", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Façade océanique directe (mer du Nord incluse ; mers semi-fermées comme la Méditerranée, la Baltique ou la mer des Caraïbes exclues).",
    en: "Direct ocean coastline (North Sea included; semi-enclosed seas such as the Mediterranean, the Baltic or the Caribbean Sea excluded).",
  },
});
