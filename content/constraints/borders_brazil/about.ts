import { defineAbout } from "../defineAbout";

export default defineAbout("borders_brazil", {
  sources: ["world_countries", "rest_countries"],
  basis: "source",
  clarification: {
    fr: "Outre-mer intégré compris.",
    en: "Integrated overseas territories included.",
  },
});
