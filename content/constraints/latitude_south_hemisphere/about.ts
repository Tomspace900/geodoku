import { defineAbout } from "../defineAbout";

export default defineAbout("latitude_south_hemisphere", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Basé sur le centre géographique du territoire.",
    en: "Based on the geographic centre of the territory.",
  },
});
