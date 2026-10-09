import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_pacific", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Les mers marginales du Pacifique comptent comme façade ; pas celles de l'archipel des Indes orientales (Banda, Timor), que l'OHI ne rattache à aucun océan.",
    en: "Marginal seas of the Pacific count as a coastline; those of the East Indian Archipelago (Banda, Timor) belong to no ocean for the IHO.",
  },
});
