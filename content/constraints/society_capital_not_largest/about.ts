import { defineAbout } from "../defineAbout";

export default defineAbout("society_capital_not_largest", {
  sources: ["cia_factbook_capital"],
  basis: "convention",
  clarification: {
    fr: "La comparaison porte sur la capitale politique, pas sur l'agglomération la plus étendue.",
    en: "The comparison is against the political capital, not the wider metropolitan area.",
  },
});
