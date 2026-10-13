import { defineAbout } from "../defineAbout";

export default defineAbout("event_fifa_wc_host", {
  sources: ["fifa_world_cup"],
  basis: "source",
  clarification: {
    fr: "Pays actuel de la ville hôte.",
    en: "Current country of the host city.",
  },
});
