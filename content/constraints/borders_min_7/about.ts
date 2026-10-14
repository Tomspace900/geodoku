import { defineAbout } from "../defineAbout";

export default defineAbout("borders_min_7", {
  sources: ["world_countries", "rest_countries"],
  basis: "source",
  clarification: {
    fr: "Frontières terrestres uniquement (subdivisions intégrées incluses ; territoires autonomes, ponts et tunnels exclus).",
    en: "Land borders only (integrated subdivisions included; autonomous territories, bridges and tunnels excluded).",
  },
});
