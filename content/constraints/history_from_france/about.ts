import { defineAbout } from "../defineAbout";

export default defineAbout("history_from_france", {
  sources: ["cia_factbook_independence"],
  basis: "source",
  clarification: {
    fr: "Indépendance obtenue de ce pays lui-même (colonie, protectorat ou mandat) ; un territoire devenu indépendant d'un autre État ne compte pas.",
    en: "Independence gained from this country itself (colony, protectorate or mandate); a territory that became independent from another state does not count.",
  },
});
