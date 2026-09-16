import { defineAbout } from "../defineAbout";

export default defineAbout("latitude_polar", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Basé sur le centre approximatif du pays, pas sur son extension territoriale.",
    en: "Based on the country's approximate centre, not its full territorial extent.",
  },
});
