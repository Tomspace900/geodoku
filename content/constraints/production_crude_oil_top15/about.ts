import { defineAbout } from "../defineAbout";

export default defineAbout("production_crude_oil_top15", {
  sources: ["eia_crude_oil"],
  basis: "source",
  clarification: null,
});
