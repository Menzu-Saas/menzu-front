"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Eye, EyeOff, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useId } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from "@/components/ui";
import { cn } from "@/lib/cn";

/** Keeps the dragged row in its column. */
const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 });

export interface CategoryListItem {
  id: string;
  name: string;
  is_active: boolean;
  count: number;
}

export interface CategoryListProps {
  categories: CategoryListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onRename: (category: CategoryListItem) => void;
  onToggleActive: (category: CategoryListItem) => void;
  onDelete: (category: CategoryListItem) => void;
}

/** Reference P3 categories column: 13px rows r12, active = brand-soft; drag handle reorders (dnd-kit). */
export function CategoryList({ categories, selectedId, onReorder, ...rowProps }: CategoryListProps) {
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = categories.map((c) => c.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      onDragEnd={onDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Pressione espaço para pegar a categoria, use as setas para mover e espaço para soltar.",
        },
      }}
    >
      <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-1" aria-label="Categorias">
          {categories.map((category) => (
            <CategoryRow
              key={category.id}
              category={category}
              selected={category.id === selectedId}
              canDrag={categories.length > 1}
              {...rowProps}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function CategoryRow({
  category,
  selected,
  canDrag,
  onSelect,
  onRename,
  onToggleActive,
  onDelete,
}: Omit<CategoryListProps, "categories" | "selectedId" | "onReorder"> & {
  category: CategoryListItem;
  selected: boolean;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group/row relative flex items-center rounded-lg transition-colors duration-150 ease-out",
        selected ? "bg-brand-soft text-brand" : "text-ink-secondary hover:bg-surface-muted",
        isDragging && "z-10 bg-surface shadow-segment",
      )}
    >
      {canDrag && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reordenar ${category.name}`}
          className={cn(
            "absolute top-1/2 left-0.5 inline-flex h-7 w-4 -translate-y-1/2 cursor-grab touch-none items-center justify-center rounded-xs",
            "text-ink-ghost transition-opacity duration-150 hover:text-ink-subtle active:cursor-grabbing",
            "opacity-100 lg:opacity-0 lg:group-hover/row:opacity-100 lg:focus-visible:opacity-100",
          )}
        >
          <GripVertical size={14} strokeWidth={1.8} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        onClick={() => onSelect(category.id)}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg py-2.75 pr-1 text-left text-body-sm",
          canDrag ? "pl-5" : "pl-3.25",
          selected ? "font-bold" : "font-semibold",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        )}
      >
        <span className={cn("flex min-w-0 items-center gap-2", !category.is_active && "text-ink-faint")}>
          <span className="truncate">{category.name}</span>
          {!category.is_active && <Icon icon={EyeOff} size={16} className="text-ink-faint" />}
        </span>
        <span className={cn("tabular-nums", !category.is_active && "text-ink-faint")}>{category.count}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Ações de ${category.name}`}
            className={cn(
              "mr-1 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              selected ? "text-brand hover:bg-brand-badge" : "text-ink-subtle hover:bg-surface",
            )}
          >
            <MoreHorizontal size={16} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <DropdownMenuItem icon={Pencil} onSelect={() => onRename(category)}>
            Renomear
          </DropdownMenuItem>
          <DropdownMenuItem icon={category.is_active ? EyeOff : Eye} onSelect={() => onToggleActive(category)}>
            {category.is_active ? "Ocultar do cardápio" : "Mostrar no cardápio"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem icon={Trash2} tone="danger" onSelect={() => onDelete(category)}>
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
