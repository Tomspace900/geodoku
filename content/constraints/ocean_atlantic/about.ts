import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_atlantic", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Une mer semi-fermée (Méditerranée, Caraïbes, mer Rouge…) ne compte pas comme façade océanique.",
    en: "A semi-enclosed sea (Mediterranean, Caribbean, Red Sea…) does not count as an ocean coastline.",
  },
});
