import { defineAbout } from "../defineAbout";

export default defineAbout("borders_min_5", {
  sources: ["world_countries", "rest_countries"],
  basis: "source",
  clarification: {
    fr: "Frontières terrestres uniquement (les ponts et tunnels maritimes ne comptent pas).",
    en: "Land borders only (sea bridges and tunnels do not count).",
  },
});
