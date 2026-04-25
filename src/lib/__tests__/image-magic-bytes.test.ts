import { describe, it, expect } from "vitest";
import {
  detectImageMime,
  validateImageFile,
  extensionForImageMime,
  MAGIC_BYTES_HEADER_SIZE,
} from "@/lib/image-magic-bytes";

/**
 * Construit un Uint8Array (backed par un ArrayBuffer — pas SharedArrayBuffer —
 * pour être assignable à BlobPart sous TS strict) avec un préfixe + padding à 0.
 */
function signature(prefix: number[], totalLen = 16): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(totalLen);
  const view = new Uint8Array(buf);
  prefix.forEach((b, i) => (view[i] = b));
  return view;
}

function blobFrom(bytes: Uint8Array<ArrayBuffer>, type = ""): Blob {
  return new Blob([bytes], { type });
}

function fileFrom(
  bytes: Uint8Array<ArrayBuffer>,
  name: string,
  type: string,
): File {
  return new File([bytes], name, { type });
}

// ─── JPEG ─────────────────────────────────────────────────────────────
// Magic : FF D8 FF E0 (JFIF) / FF D8 FF E1 (Exif) / FF D8 FF DB (raw) …
const JPEG_JFIF = signature([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const JPEG_EXIF = signature([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x24, 0x45, 0x78]);
const JPEG_RAW = signature([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x05]);

// ─── PNG ──────────────────────────────────────────────────────────────
// Magic : 89 50 4E 47 0D 0A 1A 0A
const PNG_SIG = signature([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ─── WebP ─────────────────────────────────────────────────────────────
// Magic : 52 49 46 46 ?? ?? ?? ?? 57 45 42 50  ("RIFF....WEBP")
const WEBP_SIG = signature([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

describe("detectImageMime", () => {
  it("détecte JPEG (JFIF, Exif, raw)", () => {
    expect(detectImageMime(JPEG_JFIF)).toBe("image/jpeg");
    expect(detectImageMime(JPEG_EXIF)).toBe("image/jpeg");
    expect(detectImageMime(JPEG_RAW)).toBe("image/jpeg");
  });

  it("détecte PNG (signature exacte 8 octets)", () => {
    expect(detectImageMime(PNG_SIG)).toBe("image/png");
  });

  it("détecte WebP (RIFF…WEBP, vérifie l'offset 8)", () => {
    expect(detectImageMime(WEBP_SIG)).toBe("image/webp");
  });

  it("retourne null pour des octets inconnus", () => {
    expect(detectImageMime(signature([0x00, 0x01, 0x02, 0x03]))).toBeNull();
    expect(detectImageMime(signature([0x47, 0x49, 0x46, 0x38]))).toBeNull(); // GIF (non autorisé)
    expect(detectImageMime(signature([0x3c, 0x3f, 0x78, 0x6d]))).toBeNull(); // SVG "<?xm"
    expect(detectImageMime(signature([0x3c, 0x21, 0x44, 0x4f]))).toBeNull(); // HTML "<!DO"
  });

  it("retourne null si moins de 12 octets", () => {
    expect(detectImageMime(new Uint8Array(4))).toBeNull();
    expect(detectImageMime(new Uint8Array(11))).toBeNull();
    expect(detectImageMime(new Uint8Array(0))).toBeNull();
  });

  it("ne se trompe PAS avec un faux 'RIFF' sans WEBP à l'offset 8", () => {
    // RIFF + contenu non-WebP (ex: WAV = 'WAVE' à l'offset 8)
    const wav = signature([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
    ]);
    expect(detectImageMime(wav)).toBeNull();
  });

  it("ne confond pas un fichier commençant par FF D8 mais sans 3e 0xFF", () => {
    const fake = signature([0xff, 0xd8, 0x00, 0x00]);
    expect(detectImageMime(fake)).toBeNull();
  });
});

describe("validateImageFile", () => {
  it("valide un JPEG légitime (MIME correct)", async () => {
    const file = fileFrom(JPEG_JFIF, "photo.jpg", "image/jpeg");
    const result = await validateImageFile(file);
    expect(result).toEqual({ ok: true, mime: "image/jpeg" });
  });

  it("valide un PNG légitime", async () => {
    const file = fileFrom(PNG_SIG, "icon.png", "image/png");
    const result = await validateImageFile(file);
    expect(result).toEqual({ ok: true, mime: "image/png" });
  });

  it("valide un WebP légitime", async () => {
    const file = fileFrom(WEBP_SIG, "cover.webp", "image/webp");
    const result = await validateImageFile(file);
    expect(result).toEqual({ ok: true, mime: "image/webp" });
  });

  it("rejette un fichier dont le Content-Type est spoofé (HTML renommé .jpg)", async () => {
    // Contenu réel = HTML "<!DOCTYPE ...", Content-Type déclaré = image/jpeg
    const htmlBytes = new TextEncoder().encode("<!DOCTYPE html><html>...");
    const file = fileFrom(htmlBytes, "evil.jpg", "image/jpeg");
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/signature image invalide/i);
    }
  });

  it("rejette un JPEG déclaré comme PNG (mismatch MIME/signature)", async () => {
    const file = fileFrom(JPEG_JFIF, "photo.png", "image/png");
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/incohérent/i);
    }
  });

  it("rejette les formats non autorisés (ex: GIF)", async () => {
    const gif = signature([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]);
    const file = fileFrom(gif, "anim.gif", "image/gif");
    const result = await validateImageFile(file);
    expect(result.ok).toBe(false);
  });

  it("rejette un fichier trop petit (< 12 octets)", async () => {
    const tiny = new File([new Uint8Array(5)], "tiny.jpg", { type: "image/jpeg" });
    const result = await validateImageFile(tiny);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/trop petit/i);
    }
  });

  it("accepte un File sans file.type déclaré (certains navigateurs)", async () => {
    // Pas de type dans le File → on tolère et on fait confiance à la signature
    const file = new File([PNG_SIG], "mystere", { type: "" });
    const result = await validateImageFile(file);
    expect(result).toEqual({ ok: true, mime: "image/png" });
  });

  it("respecte l'allowlist personnalisée (ex: PNG only)", async () => {
    const file = fileFrom(JPEG_JFIF, "photo.jpg", "image/jpeg");
    const result = await validateImageFile(file, ["image/png"]);
    expect(result.ok).toBe(false);
  });

  it("fonctionne avec un Blob (pas seulement File)", async () => {
    const blob = blobFrom(PNG_SIG, "image/png");
    const result = await validateImageFile(blob);
    expect(result).toEqual({ ok: true, mime: "image/png" });
  });
});

describe("extensionForImageMime", () => {
  it("retourne l'extension canonique pour chaque MIME", () => {
    expect(extensionForImageMime("image/jpeg")).toBe("jpg");
    expect(extensionForImageMime("image/png")).toBe("png");
    expect(extensionForImageMime("image/webp")).toBe("webp");
  });
});

describe("constants", () => {
  it("MAGIC_BYTES_HEADER_SIZE vaut 12 (minimum pour WebP)", () => {
    expect(MAGIC_BYTES_HEADER_SIZE).toBe(12);
  });
});
