import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_multiple_basins", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Accès direct à au moins deux océans (Atlantique, Pacifique, Indien, Arctique), hors mers semi-fermées et territoires autonomes.",
    en: "Direct access to at least two oceans (Atlantic, Pacific, Indian, Arctic), semi-enclosed seas and autonomous territories excluded.",
  },
});
