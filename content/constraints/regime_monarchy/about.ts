import { defineAbout } from "../defineAbout";

export default defineAbout("regime_monarchy", {
  sources: ["cia_factbook_government_type"],
  basis: "convention",
  clarification: {
    fr: "Monarchies constitutionnelles et absolues comptent ; chaque royaume du Commonwealth est compté séparément.",
    en: "Constitutional and absolute monarchies both count; each Commonwealth realm is counted separately.",
  },
});
