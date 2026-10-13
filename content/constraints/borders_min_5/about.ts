import { defineAbout } from "../defineAbout";

export default defineAbout("borders_min_5", {
  sources: ["world_countries", "rest_countries"],
  basis: "source",
  clarification: {
    fr: "Frontières terrestres uniquement (les ponts et tunnels maritimes ne comptent pas). Outre-mer intégré compris.",
    en: "Land borders only (sea bridges and tunnels do not count). Integrated overseas territories included.",
  },
});
