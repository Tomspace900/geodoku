import { defineAbout } from "../defineAbout";

export default defineAbout("time_zones_multiple", {
  sources: ["iana_tz"],
  basis: "source",
  clarification: {
    fr: "Plusieurs décalages horaires civils simultanés.",
    en: "Several simultaneous civil time offsets.",
  },
});
