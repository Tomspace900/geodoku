import { defineAbout } from "../defineAbout";

export default defineAbout("flag_has_cross", {
  sources: ["un_flags"],
  basis: "convention",
  clarification: {
    fr: "Classement visuel du drapeau national, armoiries comprises, quelle que soit leur taille. Un drapeau de service distinct ne compte pas.",
    en: "Visual classification of the national flag, coat of arms included, whatever its size. A separate service flag does not count.",
  },
});
