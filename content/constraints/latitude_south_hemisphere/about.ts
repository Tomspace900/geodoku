import { defineAbout } from "../defineAbout";

export default defineAbout("latitude_south_hemisphere", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Le centre géographique du pays doit se situer au sud de l'équateur.",
    en: "The country's geographic centre must lie south of the equator.",
  },
});
