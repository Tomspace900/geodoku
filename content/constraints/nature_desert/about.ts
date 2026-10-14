import { defineAbout } from "../defineAbout";

export default defineAbout("nature_desert", {
  sources: ["nasa_modis_mcd12q1"],
  basis: "convention",
  clarification: {
    fr: "Au moins un désert nommé et reconnaissable\u00A0; une zone seulement semi-aride ne suffit pas.",
    en: "At least one named, recognisable desert; a merely semi-arid area is not enough.",
  },
});
