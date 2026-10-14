import { defineAbout } from "../defineAbout";

export default defineAbout("latitude_polar", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Basé sur le centre géographique du territoire (territoires autonomes exclus).",
    en: "Based on the geographic centre of the territory (autonomous territories excluded).",
  },
});
