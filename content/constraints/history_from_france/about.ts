import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_france", {
  sources: ["cia_factbook_independence"],
  basis: "source",
  clarification: {
    fr: "Inclut colonies, protectorats, mandats et administrations conjointes de souveraineté française.",
    en: "Includes colonies, protectorates, mandates and joint administrations under French sovereignty.",
  },
});
