import { defineAbout } from "../defineAbout";

export default defineAbout("political_opec", {
  sources: ["rest_countries_memberships"],
  basis: "source",
  clarification: {
    fr: "Organisation des pays exportateurs de pétrole.",
    en: "Organization of the Petroleum Exporting Countries.",
  },
});
