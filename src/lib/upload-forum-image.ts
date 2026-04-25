import { compressImage } from "@/lib/image-compress";
import { validateImageFile } from "@/lib/image-magic-bytes";
import { uploadImageAction } from "@/actions/uploads";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Upload d'image forum : compression côté client puis envoi à la Server
 * Action `uploadImageAction` qui porte la validation autoritative (magic
 * bytes, auth, rate-limit, bucket allowlist).
 *
 * Le pré-check côté client (taille + signature) sert au feedback UX
 * immédiat ; la sécurité repose exclusivement sur le check serveur.
 */
export async function uploadForumImage(
  file: File,
): Promise<{ url: string | null; error: string | null }> {
  if (file.size > MAX_SIZE) {
    return { url: null, error: "Image trop lourde (max 5 MB)" };
  }

  const preCheck = await validateImageFile(file);
  if (!preCheck.ok) {
    return { url: null, error: preCheck.error };
  }

  // Compression à 1200px max — réduit bande passante mobile + coût stockage
  let toUpload: File;
  try {
    toUpload = await compressImage(file, { maxWidth: 1200 });
  } catch {
    toUpload = file;
  }

  const formData = new FormData();
  formData.append("file", toUpload);
  formData.append("bucket", "forum-images");

  const result = await uploadImageAction(formData);
  return { url: result.url, error: result.error };
}
