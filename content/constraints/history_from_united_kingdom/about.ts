import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_united_kingdom", {
  sources: [
    "cia_factbook_background",
    "britannica",
    "cia_factbook_independence",
  ],
  basis: "convention",
  clarification: {
    fr: "Colonie, protectorat, mandat ou État protégé, même avant une autre tutelle ; une partie compte si elle a la capitale ou s'est unie au pays. Occupations exclues.",
    en: "Colony, protectorate, mandate or protected state, even before another ruler; a part counts if it holds the capital or joined the country. Occupations excluded.",
  },
});
