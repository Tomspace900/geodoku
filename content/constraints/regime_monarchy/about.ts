import { defineAbout } from "../defineAbout";

export default defineAbout("regime_monarchy", {
  sources: ["cia_factbook_government_type"],
  basis: "convention",
  clarification: {
    fr: "Monarchies constitutionnelles comprises, même quand le souverain est celui d'un autre État.",
    en: "Constitutional monarchies included, even when the monarch is another state's sovereign.",
  },
});
