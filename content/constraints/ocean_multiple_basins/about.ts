import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_multiple_basins", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Accès direct à au moins deux océans (mers semi-fermées exclues).",
    en: "Direct access to at least two oceans (semi-enclosed seas excluded).",
  },
});
