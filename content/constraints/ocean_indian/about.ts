import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_indian", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Façade océanique directe (mers semi-fermées comme la mer Rouge exclues).",
    en: "Direct ocean coastline (semi-enclosed seas such as the Red Sea excluded).",
  },
});
