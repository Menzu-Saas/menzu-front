"use client";

import { ImagePlus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Icon, notify } from "@/components/ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { setRestaurantImageAction } from "@/server/actions/settings";
import { ACTION_FAILED } from "@/components/admin/safely";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 3 * 1024 * 1024;

export interface ImageFieldProps {
  kind: "logo" | "banner";
  restaurantId: string;
  hasImage: boolean;
  /** Called with the new public URL (or null when removed). */
  onChange: (url: string | null) => void;
}

/**
 * Uploads straight to Storage (`restaurant-assets/{restaurant_id}/{kind}-{uuid}.{ext}`, bucket policies:
 * OWNER/MANAGER of that folder), then the server action stores the URL. JPG/PNG/WEBP up to 3 MB.
 */
export function ImageField({ kind, restaurantId, hasImage, onChange }: ImageFieldProps) {
  const rid = restaurantId;
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const noun = kind === "logo" ? "logo" : "capa";

  async function upload(file: File) {
    const ext = TYPES[file.type];
    if (!ext) return notify.error("Use uma imagem JPG, PNG ou WEBP.");
    if (file.size > MAX_BYTES) return notify.error("A imagem deve ter no máximo 3 MB.");
    setBusy(true);
    try {
      const path = `${restaurantId}/${kind}-${crypto.randomUUID()}.${ext}`;
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.storage
        .from("restaurant-assets")
        .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (error) throw error;
      const result = await setRestaurantImageAction(rid, kind, path);
      if (!result.ok) {
        await supabase.storage.from("restaurant-assets").remove([path]);
        notify.error(result.error ?? ACTION_FAILED);
        return;
      }
      onChange(result.url ?? null);
      notify.success(kind === "logo" ? "Logo atualizado." : "Capa atualizada.");
      router.refresh();
    } catch {
      notify.error(`Não foi possível enviar a ${noun === "logo" ? "imagem do logo" : "capa"}. Tente novamente.`);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    const result = await setRestaurantImageAction(rid, kind, null).catch(() => ({ ok: false as const, error: ACTION_FAILED }));
    setBusy(false);
    if (!result.ok) return notify.error(result.error ?? "Não foi possível remover a imagem.");
    onChange(null);
    notify.success(kind === "logo" ? "Logo removido." : "Capa removida.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input
        ref={input}
        type="file"
        accept={Object.keys(TYPES).join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button variant="outline" size="sm" loading={busy} onClick={() => input.current?.click()}>
        <Icon icon={hasImage ? Upload : ImagePlus} size={16} />
        {hasImage ? `Trocar ${noun}` : `Enviar ${noun}`}
      </Button>
      {hasImage && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={remove} className="text-danger">
          <Icon icon={Trash2} size={16} />
          Remover
        </Button>
      )}
    </div>
  );
}
