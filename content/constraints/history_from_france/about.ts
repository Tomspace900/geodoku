import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_france", {
  sources: [
    "cia_factbook_background",
    "britannica",
    "cia_factbook_independence",
  ],
  basis: "convention",
  clarification: {
    fr: "Colonie, protectorat ou mandat, même avant une autre tutelle ; une partie compte si elle a la capitale. Occupations et annexions napoléoniennes exclues.",
    en: "Colony, protectorate or mandate, even before another ruler; a part counts if it holds the capital. Occupations and Napoleonic annexations excluded.",
  },
});
