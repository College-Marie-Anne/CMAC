"use client";

import { useState, useRef, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/feed/user-avatar";
import { updateAvatarAction } from "@/actions/profile";
import { createClient } from "@/utils/supabase/client";
import { compressImage } from "@/lib/image-compress";

interface AvatarUploadProps {
  firstName: string;
  lastName: string;
  currentUrl: string | null;
  userId: string;
}

export function AvatarUpload({ firstName, lastName, currentUrl, userId }: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format : JPG, PNG ou WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Taille max : 2 MB");
      return;
    }

    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    startTransition(async () => {
      const supabase = createClient();

      // Compression côté client à 400px max, forcé en JPEG (spec §804).
      // Réduit drastiquement le poids des PNG d'avatar.
      let toUpload: File;
      try {
        toUpload = await compressImage(file, {
          maxWidth: 400,
          maxHeight: 400,
          preferJpeg: true,
        });
      } catch {
        toUpload = file;
      }

      const ext = (toUpload.name.split(".").pop() ?? "jpg").toLowerCase();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, toUpload, { upsert: true });

      if (uploadErr) {
        setError("Erreur d'upload");
        setPreview(currentUrl);
        return;
      }

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      // Add cache-bust to force refresh
      const url = `${urlData.publicUrl}?t=${Date.now()}`;

      const result = await updateAvatarAction(url);
      if (!result.success) {
        setError(result.error ?? "Erreur");
        setPreview(currentUrl);
      } else {
        setPreview(url);
      }
      URL.revokeObjectURL(objectUrl);
    });
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <UserAvatar
          firstName={firstName}
          lastName={lastName}
          avatarUrl={preview}
          size="xl"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isPending}
          className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-cma-bordeaux text-white flex items-center justify-center shadow-lg hover:bg-cma-bordeaux/90 transition-colors"
          aria-label="Changer la photo de profil"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
        </button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
