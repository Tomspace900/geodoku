import { defineAbout } from "../defineAbout";

export default defineAbout("population_lt_1M", {
  sources: ["rest_countries"],
  basis: "source",
  clarification: null,
});
