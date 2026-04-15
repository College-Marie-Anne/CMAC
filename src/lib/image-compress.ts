/**
 * Compression / redimensionnement d'images côté client (canvas).
 *
 * Spec §806-807 : Image forum / DM redimensionnée à 1200px largeur max.
 * Cet utilitaire est appelé AVANT l'upload Supabase Storage pour réduire le
 * poids (bande passante mobile + coût stockage).
 *
 * - Si l'image est déjà ≤ maxWidth, on la retourne telle quelle (no-op).
 * - Sinon, on redimensionne proportionnellement et on encode :
 *     - JPEG / WebP → MIME conservé (qualité 0.85)
 *     - PNG → conserve PNG (sans perte) sauf si l'option preferJpeg est passée.
 * - Conserve le nom de fichier d'origine.
 * - Ne s'exécute QUE côté navigateur (utilise canvas + Image).
 */

export type CompressOptions = {
  /** Largeur cible max en pixels. Hauteur ajustée proportionnellement. */
  maxWidth?: number;
  /** Hauteur cible max en pixels (optionnel — limite en plus de maxWidth). */
  maxHeight?: number;
  /** Qualité JPEG/WebP entre 0 et 1. Default 0.85. */
  quality?: number;
  /** Si true, force la sortie en JPEG (utile pour avatars carrés). */
  preferJpeg?: boolean;
};

const DEFAULT_OPTIONS: Required<Omit<CompressOptions, "maxHeight">> = {
  maxWidth: 1200,
  quality: 0.85,
  preferJpeg: false,
};

/**
 * Compresse / redimensionne un File image. Retourne un nouveau File
 * (ou le File d'origine si aucune transformation nécessaire).
 *
 * Throws si le fichier n'est pas un Blob image décodable par le navigateur.
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = DEFAULT_OPTIONS.maxWidth,
    maxHeight,
    quality = DEFAULT_OPTIONS.quality,
    preferJpeg = DEFAULT_OPTIONS.preferJpeg,
  } = options;

  // Décodage de l'image dans un objet HTMLImageElement
  const dataUrl = await readFileAsDataURL(file);
  const img = await loadImage(dataUrl);

  // Calcul des nouvelles dimensions (préserve le ratio)
  let { width, height } = img;
  const widthScale = width > maxWidth ? maxWidth / width : 1;
  const heightScale =
    maxHeight && height > maxHeight ? maxHeight / height : 1;
  const scale = Math.min(widthScale, heightScale);

  // No-op : déjà sous les seuils → retourne le fichier d'origine
  if (scale >= 1 && !preferJpeg) {
    return file;
  }

  width = Math.round(width * scale);
  height = Math.round(height * scale);

  // Rendu sur canvas
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D non supporté");
  ctx.drawImage(img, 0, 0, width, height);

  // Choix du MIME de sortie
  const outputMime =
    preferJpeg || file.type === "image/jpeg"
      ? "image/jpeg"
      : file.type === "image/webp"
      ? "image/webp"
      : file.type === "image/png"
      ? "image/png"
      : "image/jpeg";

  const blob = await canvasToBlob(canvas, outputMime, quality);

  // Conserve le nom d'origine, ajuste l'extension si on a forcé JPEG
  const finalName =
    preferJpeg && !file.name.toLowerCase().endsWith(".jpg")
      ? file.name.replace(/\.[^.]+$/, "") + ".jpg"
      : file.name;

  return new File([blob], finalName, {
    type: outputMime,
    lastModified: Date.now(),
  });
}

// ─── helpers internes ───

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () =>
      reject(reader.error ?? new Error("Lecture du fichier échouée"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Impossible de décoder l'image"));
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Conversion canvas → Blob échouée"));
      },
      mime,
      quality
    );
  });
}
