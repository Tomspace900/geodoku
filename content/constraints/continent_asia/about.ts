import { defineAbout } from "../defineAbout";

export default defineAbout("continent_asia", {
  sources: ["world_countries", "un_m49"],
  basis: "convention",
  clarification: {
    fr: "Chaque pays transcontinental est rattaché à un seul continent.",
    en: "Each transcontinental country is assigned to a single continent.",
  },
});
