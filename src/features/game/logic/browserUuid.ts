const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBrowserUuidV4(value: unknown): value is string {
  return typeof value === "string" && UUID_V4_PATTERN.test(value);
}

/** Génère un UUID v4 même lorsque `randomUUID` est indisponible ou interdit. */
export function createBrowserUuidV4(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      const uuid = globalThis.crypto.randomUUID();
      if (isBrowserUuidV4(uuid)) return uuid;
    }
  } catch {
    // Certains navigateurs exposent la méthode mais la refusent hors contexte sécurisé.
  }

  const bytes = new Uint8Array(16);
  try {
    if (typeof globalThis.crypto?.getRandomValues !== "function") {
      throw new Error("Web Crypto unavailable");
    }
    globalThis.crypto.getRandomValues(bytes);
  } catch {
    bytes.forEach((_, index) => {
      bytes[index] = Math.floor(Math.random() * 256);
    });
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
