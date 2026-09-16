import { defineAbout } from "../defineAbout";

export default defineAbout("population_gt_100M", {
  sources: ["rest_countries"],
  basis: "source",
  clarification: null,
});
