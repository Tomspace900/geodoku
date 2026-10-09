import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_pacific", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Les mers marginales du Pacifique comptent comme façade ; pas celles de l'archipel indonésien (Banda, Timor), rattachées à aucun océan.",
    en: "Marginal seas of the Pacific count as a coastline; those of the Indonesian archipelago (Banda, Timor) belong to no ocean.",
  },
});
