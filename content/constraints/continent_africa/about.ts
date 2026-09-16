import { defineAbout } from "../defineAbout";

export default defineAbout("continent_africa", {
  sources: ["un_m49"],
  basis: "convention",
  clarification: {
    fr: "Un pays à cheval sur deux continents n'est compté que dans un seul.",
    en: "A country spanning two continents counts for only one of them.",
  },
});
