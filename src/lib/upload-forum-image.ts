import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Upload an image to the forum-images Supabase Storage bucket.
 * Returns the public URL or null on failure.
 */
export async function uploadForumImage(
  supabase: SupabaseClient,
  file: File,
  userId: string
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { url: null, error: "Format non supporté (JPG, PNG ou WebP)" };
  }

  if (file.size > MAX_SIZE) {
    return { url: null, error: "Image trop lourde (max 5 MB)" };
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("forum-images")
    .upload(path, file, { upsert: false });

  if (uploadError) {
    return { url: null, error: "Erreur lors de l'upload" };
  }

  const { data: urlData } = supabase.storage
    .from("forum-images")
    .getPublicUrl(path);

  return { url: urlData.publicUrl, error: null };
}
