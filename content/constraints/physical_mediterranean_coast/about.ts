import { defineAbout } from "../defineAbout";

export default defineAbout("physical_mediterranean_coast", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Façade directe sur la Méditerranée ou ses mers secondaires (Adriatique, Égée…), hors mer Noire.",
    en: "Direct coastline on the Mediterranean or its secondary seas (Adriatic, Aegean…), Black Sea excluded.",
  },
});
