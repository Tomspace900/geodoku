import { defineAbout } from "../defineAbout";

export default defineAbout("latitude_south_hemisphere", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "D'après le centre approximatif du pays, pas son extension territoriale.",
    en: "Based on the country's approximate centre, not its full extent.",
  },
});
