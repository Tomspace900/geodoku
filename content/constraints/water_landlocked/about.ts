import { defineAbout } from "../defineAbout";

export default defineAbout("water_landlocked", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Un accès uniquement à une mer fermée (non reliée aux océans) ne lève pas l'enclavement.",
    en: "Access to a closed sea only (not connected to the oceans) does not remove landlocked status.",
  },
});
