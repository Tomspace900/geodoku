import fontUrl from "./TwemojiCountryFlags.woff2";

/**
 * Drapeaux emoji là où le système n'en a pas (#51) : Windows n'a aucun glyphe
 * de drapeau, Edge et Chrome y écrivent « FR » au lieu de 🇫🇷. Même nom en tête
 * des piles de `tailwind.config.ts`.
 *
 * La police (Twemoji, CC-BY 4.0, sous-ensemble des drapeaux tiré de
 * country-flag-emoji-polyfill, MIT ; crédit dans la page Confidentialité) se limite aux caractères de drapeaux par
 * `unicodeRange` : le reste du texte ne la voit pas. Elle part dès le
 * démarrage et en `display: block`, pour qu'un drapeau ne s'affiche jamais
 * d'abord en lettres.
 */
export const FLAG_FONT_FAMILY = "Twemoji Country Flags";

const FLAG_UNICODE_RANGE =
  "U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F";

export function installFlagEmojiFont(): void {
  if (canDrawFlagEmoji()) return;
  const face = new FontFace(FLAG_FONT_FAMILY, `url(${fontUrl})`, {
    unicodeRange: FLAG_UNICODE_RANGE,
    display: "block",
  });
  document.fonts.add(face);
  void face.load().catch(() => undefined);
}

// Un emoji absent se dessine en lettres noires ou ne se dessine pas : seule une
// couleur propre au glyphe distingue un vrai drapeau.
function canDrawFlagEmoji(): boolean {
  const context = document
    .createElement("canvas")
    .getContext("2d", { willReadFrequently: true });
  if (!context) return true;
  context.canvas.width = context.canvas.height = 1;
  context.textBaseline = "top";
  context.font = "100px sans-serif";
  context.scale(0.01, 0.01);
  const pixel = (color: string) => {
    context.clearRect(0, 0, 100, 100);
    context.fillStyle = color;
    context.fillText("\u{1F1E8}\u{1F1ED}", 0, 0);
    return context.getImageData(0, 0, 1, 1).data.join(",");
  };
  const onBlack = pixel("#000");
  return onBlack === pixel("#fff") && !onBlack.startsWith("0,0,0,");
}
