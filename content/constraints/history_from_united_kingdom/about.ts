import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_united_kingdom", {
  sources: ["cia_factbook_independence"],
  basis: "source",
  clarification: {
    fr: "Colonies, protectorats et mandats inclus.",
    en: "Colonies, protectorates and mandates included.",
  },
});
