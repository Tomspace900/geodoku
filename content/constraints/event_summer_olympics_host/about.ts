import { defineAbout } from "../defineAbout";

export default defineAbout("event_summer_olympics_host", {
  sources: ["ioc_olympic_hosts"],
  basis: "source",
  clarification: {
    fr: "Pays hôte d'au moins une édition ; une édition compte pour le pays où se trouve aujourd'hui la ville hôte.",
    en: "Host of at least one edition; an edition counts for the country where the host city lies today.",
  },
});
