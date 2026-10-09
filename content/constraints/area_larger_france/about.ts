import { defineAbout } from "../defineAbout";

export default defineAbout("area_larger_france", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Superficie de la France métropolitaine seule : l'outre-mer n'est pas compté (exception assumée à la règle territoriale).",
    en: "Area of metropolitan France alone: overseas territories are not counted (a deliberate exception to the territorial rule).",
  },
});
