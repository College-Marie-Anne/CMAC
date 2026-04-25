/**
 * Magic bytes (file signature) validation for uploaded images.
 *
 * Le header HTTP `Content-Type` et la propriété `File.type` côté client sont
 * tous les deux spoofables : renommer `evil.html` en `photo.jpg` suffit pour
 * que `file.type` devienne `image/jpeg`. La seule source fiable est la
 * signature binaire des premiers octets du fichier (« magic bytes »).
 *
 * Cet utilitaire est utilisable côté client (feedback UX rapide) ET côté
 * serveur (validation autoritative, ex: Server Action avant upload Storage).
 *
 * Signatures couvertes :
 *   - JPEG : FF D8 FF ??            (offset 0)
 *   - PNG  : 89 50 4E 47 0D 0A 1A 0A (offset 0)
 *   - WebP : 52 49 46 46 ?? ?? ?? ?? 57 45 42 50 ("RIFF....WEBP")
 *
 * Référence : https://en.wikipedia.org/wiki/List_of_file_signatures
 */

export type ImageMimeType = "image/jpeg" | "image/png" | "image/webp";

export const ALLOWED_IMAGE_MIMES: readonly ImageMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

/** Minimum d'octets nécessaires pour identifier toutes les signatures supportées. */
export const MAGIC_BYTES_HEADER_SIZE = 12;

/**
 * Détecte le type MIME d'un blob image à partir de ses premiers octets.
 * Retourne `null` si aucune signature connue n'est détectée.
 *
 * Ne lit PAS au-delà de 12 octets — purement structurel, pas de parsing.
 */
export function detectImageMime(bytes: Uint8Array): ImageMimeType | null {
  if (bytes.length < MAGIC_BYTES_HEADER_SIZE) return null;

  // PNG : 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  // JPEG : FF D8 FF (le 4e octet varie — E0, E1, DB, EE, EB selon l'encodeur)
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // WebP : "RIFF" (52 49 46 46) + taille (4 octets, skip) + "WEBP" (57 45 42 50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export type ValidateImageResult =
  | { ok: true; mime: ImageMimeType }
  | { ok: false; error: string };

/**
 * Valide qu'un Blob/File commence par une signature d'image connue et
 * autorisée, et que son MIME déclaré (si présent) correspond à la signature
 * détectée.
 *
 * À utiliser impérativement côté serveur (Server Action) avant tout upload
 * vers Supabase Storage. Peut aussi être appelé côté client pour un feedback
 * UX précoce, mais ne constitue PAS une mesure de sécurité à lui seul —
 * un attaquant ignorera simplement le code client.
 */
export async function validateImageFile(
  file: File | Blob,
  allowed: readonly ImageMimeType[] = ALLOWED_IMAGE_MIMES,
): Promise<ValidateImageResult> {
  if (file.size < MAGIC_BYTES_HEADER_SIZE) {
    return { ok: false, error: "Fichier trop petit pour être une image valide" };
  }

  const head = await file.slice(0, MAGIC_BYTES_HEADER_SIZE).arrayBuffer();
  const detected = detectImageMime(new Uint8Array(head));

  if (!detected) {
    return {
      ok: false,
      error: "Format de fichier non reconnu (signature image invalide)",
    };
  }

  if (!allowed.includes(detected)) {
    return { ok: false, error: "Format non supporté (JPG, PNG ou WebP)" };
  }

  // Si le client a déclaré un MIME, il doit correspondre à la signature réelle.
  // Un mismatch révèle soit une extension trompée, soit un Content-Type falsifié.
  // (On tolère un file.type vide, certains navigateurs ne le remplissent pas.)
  const declared = "type" in file ? file.type : "";
  if (declared && declared !== detected) {
    return {
      ok: false,
      error:
        "Type de fichier incohérent : le contenu ne correspond pas à l'extension déclarée",
    };
  }

  return { ok: true, mime: detected };
}

/** Retourne l'extension canonique pour un MIME image validé. */
export function extensionForImageMime(mime: ImageMimeType): "jpg" | "png" | "webp" {
  return mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
}
