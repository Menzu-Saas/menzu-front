"use client";

import { PREVIEW_ID } from "@/lib/restaurant-preview";

import { useRouter } from "next/navigation";
import { Layers, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  Button,
  ConfirmationDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  IconButton,
  notify,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/money";
import { deleteAddonGroupAction } from "@/server/actions/menu";
import type { AddonGroupRow } from "@/server/queries/menu";
import { AddonGroupEditor } from "./addon-group-editor";
import { useRestaurantId } from "@/components/admin/current-restaurant";

type EditorState = { group: AddonGroupRow | null } | null;

/** Addon groups library: reference P3 "Grupo de adicionais" cards with option pills (price in brand). */
export function AddonLibrary({
  groups,
  openNew,
  focusId,
}: {
  groups: AddonGroupRow[];
  openNew: boolean;
  focusId: string | null;
}) {
  const rid = useRestaurantId();
  const router = useRouter();
  const [editor, setEditor] = useState<EditorState>(() => {
    if (openNew) return { group: null };
    const focus = groups.find((g) => g.id === focusId && !g.id.startsWith(PREVIEW_ID));
    return focus ? { group: focus } : null;
  });
  const [deleting, setDeleting] = useState<AddonGroupRow | null>(null);

  function closeEditor() {
    setEditor(null);
    if (openNew || focusId) router.replace("/painel/complementos", { scroll: false });
  }

  return (
    <>
      {groups.length === 0 ? (
        <div className="rounded-6xl border border-frame bg-surface shadow-card">
          <EmptyState
            icon={Layers}
            title="Nenhum grupo de complementos"
            description="Crie grupos como Adicionais, Molhos ou Ponto da carne e vincule-os aos itens do cardápio."
            action={<Button onClick={() => setEditor({ group: null })}>+ Novo grupo</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((g) => (
            <article key={g.id} className="flex flex-col gap-3.5 rounded-4xl border border-line bg-surface p-5">
              <header className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <h2 className="text-item font-extrabold text-ink">{g.name}</h2>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={g.is_required ? "brand" : "neutral"} size="sm">
                      {g.is_required ? "OBRIGATÓRIO" : "OPCIONAL"}
                    </Badge>
                    <span className="text-caption text-ink-muted">
                      {g.min_select === g.max_select
                        ? `Escolher ${g.max_select}`
                        : `Mín. ${g.min_select} · máx. ${g.max_select}`}{" "}
                      · {g.products === 1 ? "usado em 1 item" : `usado em ${g.products} itens`}
                    </span>
                  </div>
                </div>
                {!g.id.startsWith(PREVIEW_ID) && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <IconButton label={`Ações de ${g.name}`} icon={MoreHorizontal} size={34} variant="outline" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
                    <DropdownMenuItem icon={Pencil} onSelect={() => setEditor({ group: g })}>
                      Editar grupo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => setDeleting(g)}>
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>}
              </header>
              <ul className="flex flex-wrap gap-2.5">
                {g.options.map((o) => (
                  <li
                    key={o.id}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg border border-line px-3.5 py-2.75",
                      !o.is_available && "bg-surface-sunken opacity-65",
                    )}
                  >
                    <span className={cn("text-body-sm font-semibold text-ink", !o.is_available && "line-through")}>
                      {o.name}
                    </span>
                    <span className="text-body-sm font-extrabold text-brand">
                      {o.price_cents > 0 ? formatMoney(o.price_cents) : "Grátis"}
                    </span>
                  </li>
                ))}
                {!g.id.startsWith(PREVIEW_ID) && <li>
                  <button
                    type="button"
                    onClick={() => setEditor({ group: g })}
                    className={cn(
                      "rounded-lg border border-dashed border-line-strong px-3.5 py-2.75 text-body-sm font-bold text-ink-muted",
                      "transition-[border-color,background-color,color] duration-150 ease-out hover:border-brand-tint-border hover:bg-brand-tint hover:text-brand",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    )}
                  >
                    + Adicional
                  </button>
                </li>}
              </ul>
            </article>
          ))}
        </div>
      )}

      <AddonGroupEditor
        key={editor ? (editor.group?.id ?? "new") : "closed"}
        open={editor !== null}
        onOpenChange={(open) => !open && closeEditor()}
        group={editor?.group ?? null}
      />
      <ConfirmationDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        tone="danger"
        title="Excluir grupo?"
        description={
          deleting
            ? deleting.products > 0
              ? `"${deleting.name}" será desvinculado de ${deleting.products === 1 ? "1 item" : `${deleting.products} itens`} e excluído.`
              : `"${deleting.name}" será excluído.`
            : ""
        }
        confirmLabel="Excluir grupo"
        onConfirm={async () => {
          if (!deleting) return;
          const res = await deleteAddonGroupAction(rid, deleting.id);
          if (!res.ok) {
            notify.error(res.error ?? "Não foi possível excluir.");
            throw new Error("delete failed");
          }
          notify.success("Grupo excluído");
        }}
      />
    </>
  );
}
