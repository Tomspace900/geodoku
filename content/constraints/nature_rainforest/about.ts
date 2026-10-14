import { defineAbout } from "../defineAbout";

export default defineAbout("nature_rainforest", {
  sources: ["nasa_modis_mcd12q1"],
  basis: "convention",
  clarification: {
    fr: "Au moins un massif de forêt tropicale humide nommé et reconnaissable\u00A0; les petites îles ne comptent pas.",
    en: "At least one named, recognisable tropical rainforest; small islands do not count.",
  },
});
