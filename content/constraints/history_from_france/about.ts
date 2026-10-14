import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_france", {
  sources: [
    "cia_factbook_background",
    "britannica",
    "cia_factbook_independence",
  ],
  basis: "convention",
  clarification: {
    fr: "Colonie, protectorat, mandat ou tutelle ayant couvert le pays ou sa capitale actuelle. Occupations exclues.",
    en: "Colony, protectorate, mandate or trusteeship covering the country or its current capital. Occupations excluded.",
  },
});
