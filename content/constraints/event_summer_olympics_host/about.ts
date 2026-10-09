import { defineAbout } from "../defineAbout";

export default defineAbout("event_summer_olympics_host", {
  sources: ["ioc_olympic_hosts"],
  basis: "source",
  clarification: {
    fr: "Pays hôte d'au moins une édition ; une édition tenue par un État disparu compte pour son État successeur.",
    en: "Host of at least one edition; an edition held by a state that no longer exists counts for its successor state.",
  },
});
