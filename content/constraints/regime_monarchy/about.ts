import { defineAbout } from "../defineAbout";

export default defineAbout("regime_monarchy", {
  sources: ["cia_factbook_government_type"],
  basis: "convention",
  clarification: {
    fr: "Monarchies constitutionnelles incluses (y compris royaumes du Commonwealth).",
    en: "Constitutional monarchies included (Commonwealth realms too).",
  },
});
