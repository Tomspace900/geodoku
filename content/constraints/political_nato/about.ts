import { defineAbout } from "../defineAbout";

export default defineAbout("political_nato", {
  sources: ["rest_countries_memberships"],
  basis: "source",
  clarification: {
    fr: "Organisation du traité de l'Atlantique Nord.",
    en: "North Atlantic Treaty Organization.",
  },
});
