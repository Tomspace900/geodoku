import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_indian", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Façade océanique directe (mers semi-fermées comme la mer Rouge et le golfe Persique exclues).",
    en: "Direct ocean coastline (semi-enclosed seas such as the Red Sea and the Persian Gulf excluded).",
  },
});
