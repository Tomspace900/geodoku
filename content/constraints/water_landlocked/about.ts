import { defineAbout } from "../defineAbout";

export default defineAbout("water_landlocked", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Un pays n'ayant accès qu'à une mer fermée (non reliée aux océans) est compté comme enclavé.",
    en: "A country with access only to a closed sea (not connected to the oceans) counts as landlocked.",
  },
});
