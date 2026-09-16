import { defineAbout } from "../defineAbout";

export default defineAbout("forest_cover_majority", {
  sources: ["fao_forest_resources"],
  basis: "source",
  clarification: {
    fr: "Le couvert forestier inclut forêts secondaires et plantations, pas seulement la forêt primaire.",
    en: "Forest cover includes secondary forest and plantations, not only primary forest.",
  },
});
