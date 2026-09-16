import { defineAbout } from "../defineAbout";

export default defineAbout("ocean_multiple_basins", {
  sources: ["iho_s23"],
  basis: "convention",
  clarification: {
    fr: "Bordé par au moins deux bassins parmi Atlantique, Pacifique, Indien et Arctique ; les mers fermées ne comptent pas.",
    en: "Bordered by at least two basins among Atlantic, Pacific, Indian and Arctic; enclosed seas don't count.",
  },
});
