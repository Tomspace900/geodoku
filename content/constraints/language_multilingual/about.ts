import { defineAbout } from "../defineAbout";

export default defineAbout("language_multilingual", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Le flou de la notion de statut officiel national explique l'archivage de cette contrainte.",
    en: "The vagueness of official national status is why this constraint was archived.",
  },
});
