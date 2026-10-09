import { defineAbout } from "../defineAbout";

export default defineAbout("language_french", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Langue officielle de droit, ou de fait là où aucune loi n'en désigne. Une langue de travail ou d'usage courant, sans statut, ne compte pas.",
    en: "Official by law, or de facto where no law names one. A working language, or one in common use without status, does not count.",
  },
});
