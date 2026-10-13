import { defineAbout } from "../defineAbout";

export default defineAbout("forest_cover_majority", {
  sources: ["fao_forest_resources"],
  basis: "source",
  clarification: {
    fr: "Surfaces boisées totales (forêts primaires, secondaires et plantations).",
    en: "Total wooded area (primary and secondary forests and plantations).",
  },
});
