import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_atlantic", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Façade directe. Mers semi-fermées (Méditerranée, Caraïbes, mer Rouge…) exclues.",
    en: "Direct coastline. Semi-enclosed seas (Mediterranean, Caribbean, Red Sea…) excluded.",
  },
});
