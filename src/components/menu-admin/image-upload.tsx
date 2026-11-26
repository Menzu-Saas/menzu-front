"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Button, ImagePlaceholder, notify } from "@/components/ui";
import { ASSETS_BUCKET, IMAGE_TYPES, validateImageFile } from "@/lib/schemas/menu";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface ImageUploadProps {
  restaurantId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  error?: string;
}

/**
 * Product photo: uploads straight to Storage (`restaurant-assets/{rid}/products/{uuid}.{ext}`) with the user's
 * session — bucket policies allow only OWNER/MANAGER of that restaurant. Max 3 MB, JPG/PNG/WEBP.
 */
export function ImageUpload({ restaurantId, value, onChange, error }: ImageUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    const problem = validateImageFile(file);
    if (problem) {
      notify.error(problem);
      return;
    }
    setUploading(true);
    try {
      const ext = IMAGE_TYPES[file.type as keyof typeof IMAGE_TYPES];
      const path = `${restaurantId}/products/${crypto.randomUUID()}.${ext}`;
      const supabase = createSupabaseBrowserClient();
      const { error: upErr } = await supabase.storage
        .from(ASSETS_BUCKET)
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(ASSETS_BUCKET).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch {
      notify.error("Não foi possível enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl border border-line">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- Storage public URL preview
          <img src={value} alt="Foto do produto" className="h-full w-full object-cover" />
        ) : (
          <ImagePlaceholder kind="food" label="Foto do prato" className="h-full w-full" />
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept={Object.keys(IMAGE_TYPES).join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" loading={uploading} onClick={() => input.current?.click()}>
          {value ? (
            <Upload size={16} strokeWidth={1.8} aria-hidden="true" />
          ) : (
            <ImagePlus size={16} strokeWidth={1.8} aria-hidden="true" />
          )}
          {value ? "Trocar foto" : "Enviar foto"}
        </Button>
        {value && (
          <Button variant="ghost" size="sm" className="text-danger" disabled={uploading} onClick={() => onChange(null)}>
            <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
            Remover
          </Button>
        )}
      </div>
      {error ? (
        <p role="alert" className="text-caption font-semibold text-danger">
          {error}
        </p>
      ) : (
        <p className="text-caption text-ink-muted">JPG, PNG ou WEBP até 3 MB. Proporção 4:3 fica melhor.</p>
      )}
    </div>
  );
}
