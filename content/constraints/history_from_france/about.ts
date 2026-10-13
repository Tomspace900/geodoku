import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_france", {
  sources: ["cia_factbook_independence"],
  basis: "source",
  clarification: {
    fr: "Colonies, protectorats et mandats inclus.",
    en: "Colonies, protectorates and mandates included.",
  },
});
