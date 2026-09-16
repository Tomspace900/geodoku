import { defineAbout } from "../defineAbout";

export default defineAbout("time_zones_multiple", {
  sources: ["iana_tz"],
  basis: "source",
  clarification: {
    fr: "Décalages horaires civils simultanés, pas le nombre de zones IANA ni les changements saisonniers.",
    en: "Simultaneous civil UTC offsets, not the count of IANA zones or seasonal changes.",
  },
});
