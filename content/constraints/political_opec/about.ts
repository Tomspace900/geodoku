import { defineAbout } from "../defineAbout";

export default defineAbout("political_opec", {
  sources: ["rest_countries"],
  basis: "source",
  clarification: {
    fr: "Pays membres actuels.",
    en: "Current member countries.",
  },
});
