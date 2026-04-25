"use server";

import { createClient } from "@/utils/supabase/server";
import {
  validateImageFile,
  extensionForImageMime,
  type ImageMimeType,
} from "@/lib/image-magic-bytes";
import { checkRateLimit, uploadImageLimiter } from "@/lib/rate-limit";

/**
 * Upload d'image avec validation autoritative côté serveur.
 *
 * Fait trois vérifications que le client NE PEUT PAS faire de manière fiable :
 *   1. Magic bytes (signature binaire réelle du fichier, non-spoofable)
 *   2. Auth + rôle / statut actif (source de vérité = cookie session SSR)
 *   3. Allowlist de bucket + chemin généré côté serveur (aucun chemin
 *      utilisateur injecté → pas de path traversal, pas de cross-user overwrite)
 *
 * Le Content-Type transmis à Supabase Storage est FORCÉ depuis la signature
 * détectée (pas depuis `file.type` qui est spoofable). Cela verrouille la
 * cohérence entre ce qui est stocké et ce qui est servi par le CDN public.
 */

export type UploadImageResult = {
  url: string | null;
  path: string | null;
  error: string | null;
};

type BucketName = "forum-images" | "dm-images" | "avatars" | "emblems";

type BucketConfig = {
  maxSize: number;
  buildPath: (ctx: { userId: string; mime: ImageMimeType; promoId?: string }) => string;
  upsert: boolean;
  adminOnly?: boolean;
  requiresPromoId?: boolean;
};

const BUCKETS: Record<BucketName, BucketConfig> = {
  "forum-images": {
    maxSize: 5 * 1024 * 1024,
    buildPath: ({ userId, mime }) =>
      `${userId}/${crypto.randomUUID()}.${extensionForImageMime(mime)}`,
    upsert: false,
  },
  "dm-images": {
    maxSize: 5 * 1024 * 1024,
    buildPath: ({ userId, mime }) =>
      `${userId}/${crypto.randomUUID()}.${extensionForImageMime(mime)}`,
    upsert: false,
  },
  avatars: {
    maxSize: 2 * 1024 * 1024,
    buildPath: ({ userId, mime }) =>
      `${userId}/avatar.${extensionForImageMime(mime)}`,
    upsert: true,
  },
  emblems: {
    maxSize: 1 * 1024 * 1024,
    buildPath: ({ promoId, mime }) =>
      `${promoId}.${extensionForImageMime(mime)}`,
    upsert: true,
    adminOnly: true,
    requiresPromoId: true,
  },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function uploadImageAction(
  formData: FormData,
): Promise<UploadImageResult> {
  try {
    const file = formData.get("file");
    const bucketRaw = formData.get("bucket");
    const promoIdRaw = formData.get("promoId");

    if (!(file instanceof File)) {
      return { url: null, path: null, error: "Fichier manquant" };
    }
    if (typeof bucketRaw !== "string" || !(bucketRaw in BUCKETS)) {
      return { url: null, path: null, error: "Bucket invalide" };
    }
    const bucket = bucketRaw as BucketName;
    const config = BUCKETS[bucket];

    // --- Auth ---
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { url: null, path: null, error: "Non authentifié" };

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("status, role")
      .eq("id", user.id)
      .single();
    if (profileErr || !profile || profile.status !== "active") {
      return { url: null, path: null, error: "Compte inactif" };
    }
    if (config.adminOnly && profile.role !== "admin") {
      return { url: null, path: null, error: "Réservé aux administratrices" };
    }

    // --- Rate limit ---
    const { allowed, resetAt } = await checkRateLimit(
      uploadImageLimiter,
      user.id,
    );
    if (!allowed) {
      const min = Math.max(1, Math.ceil((resetAt - Date.now()) / 60000));
      return {
        url: null,
        path: null,
        error: `Trop d'uploads. Réessayez dans ${min} min`,
      };
    }

    // --- Taille ---
    if (file.size > config.maxSize) {
      const mb = Math.round(config.maxSize / (1024 * 1024));
      return {
        url: null,
        path: null,
        error: `Image trop lourde (max ${mb} MB)`,
      };
    }

    // --- Magic bytes (check autoritatif) ---
    const check = await validateImageFile(file);
    if (!check.ok) {
      return { url: null, path: null, error: check.error };
    }

    // --- promoId pour les emblèmes : validation + vérification d'existence ---
    let promoId: string | undefined;
    if (config.requiresPromoId) {
      if (typeof promoIdRaw !== "string" || !UUID_RE.test(promoIdRaw)) {
        return { url: null, path: null, error: "promoId invalide" };
      }
      promoId = promoIdRaw;

      const { data: promo, error: promoErr } = await supabase
        .from("promotions")
        .select("id")
        .eq("id", promoId)
        .single();
      if (promoErr || !promo) {
        return { url: null, path: null, error: "Promotion introuvable" };
      }
    }

    // --- Upload ---
    const path = config.buildPath({ userId: user.id, mime: check.mime, promoId });
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: config.upsert,
        // Force le Content-Type depuis la signature détectée : ignore
        // volontairement `file.type` qui est spoofable.
        contentType: check.mime,
      });

    if (uploadErr) {
      console.error("[uploadImageAction] storage error", uploadErr);
      return { url: null, path: null, error: "Erreur lors de l'upload" };
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: urlData.publicUrl, path, error: null };
  } catch (err) {
    console.error("[uploadImageAction]", err);
    return { url: null, path: null, error: "Erreur inattendue" };
  }
}
