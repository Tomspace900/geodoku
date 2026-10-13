import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_indian", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Façade directe. Mers semi-fermées (Méditerranée, Caraïbes, mer Rouge…) exclues. Outre-mer intégré compris.",
    en: "Direct coastline. Semi-enclosed seas (Mediterranean, Caribbean, Red Sea…) excluded. Integrated overseas territories included.",
  },
});
