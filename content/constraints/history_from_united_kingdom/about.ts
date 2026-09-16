import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_united_kingdom", {
  sources: ["cia_factbook_independence"],
  basis: "source",
  clarification: {
    fr: "Inclut colonies, protectorats, mandats et indépendances graduelles de souveraineté britannique.",
    en: "Includes colonies, protectorates, mandates and gradual independences under British sovereignty.",
  },
});
