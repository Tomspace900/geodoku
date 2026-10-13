import { defineAbout } from "../defineAbout";

export default defineAbout("language_portuguese", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Langue officielle de droit ou d'usage national prédominant. Langues régionales ou de travail exclues.",
    en: "Official by law, or predominant in national use. Regional or working languages excluded.",
  },
});
