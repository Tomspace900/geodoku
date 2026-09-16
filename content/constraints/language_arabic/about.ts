import { defineAbout } from "../defineAbout";

export default defineAbout("language_arabic", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "Seul le statut de langue officielle nationale compte, pas un usage régional ou de fait.",
    en: "Only official national language status counts, not regional or de facto use.",
  },
});
