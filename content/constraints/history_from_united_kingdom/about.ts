import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_united_kingdom", {
  sources: [
    "cia_factbook_background",
    "britannica",
    "cia_factbook_independence",
  ],
  basis: "convention",
  clarification: {
    fr: "Colonie, protectorat, mandat, tutelle ou État protégé. Occupations militaires exclues.",
    en: "Colony, protectorate, mandate, trusteeship or protected state. Military occupations excluded.",
  },
});
