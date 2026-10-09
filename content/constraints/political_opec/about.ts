import { defineAbout } from "../defineAbout";

export default defineAbout("political_opec", {
  sources: ["rest_countries"],
  basis: "source",
  clarification: {
    fr: "Membres de l'OPEP en octobre 2026 ; un pays sorti de l'organisation n'est plus compté.",
    en: "OPEC members as of October 2026; a country that has left the organisation is no longer counted.",
  },
});
