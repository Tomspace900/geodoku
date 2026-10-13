import { defineAbout } from "../defineAbout";

export default defineAbout("area_larger_france", {
  sources: ["world_countries"],
  basis: "source",
  clarification: {
    fr: "France métropolitaine uniquement (~550\u00A0000\u00A0km²).",
    en: "Metropolitan France only (~550,000 km²).",
  },
});
