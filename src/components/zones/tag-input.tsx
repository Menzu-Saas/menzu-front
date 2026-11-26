"use client";

import { X } from "lucide-react";
import { useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useFieldControlProps } from "@/components/ui";
import { cn } from "@/lib/cn";
import { dedupeNeighborhoods, splitNeighborhoods } from "@/lib/schemas/zone";

/**
 * Tag input for neighbourhoods: Enter, comma or Tab adds the typed name; Backspace on an empty
 * field removes the last tag; pasting "A, B; C" adds them all. Same shell as Input (muted, r13, 2px accent focus).
 */
export function TagInput({
  value,
  onChange,
  placeholder,
  id,
  invalid: invalidProp,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
  invalid?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const { invalid, ...aria } = useFieldControlProps({ id, invalid: invalidProp });

  function commit(raw: string) {
    const added = splitNeighborhoods(raw);
    if (added.length) onChange(dedupeNeighborhoods([...value, ...added]));
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Tab" && draft.trim()) {
      e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (/[,;\n]/.test(text)) {
      e.preventDefault();
      commit(draft + text);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-lg border bg-surface-muted px-2 py-1.5",
        "transition-[background-color,border-color,box-shadow] duration-150 ease-out",
        "focus-within:bg-surface focus-within:ring-1 focus-within:ring-inset",
        invalid
          ? "border-danger focus-within:border-danger focus-within:ring-danger"
          : "border-line focus-within:border-accent focus-within:ring-accent",
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-md border border-line bg-surface py-1 pr-1 pl-2.5 text-caption font-semibold text-ink-secondary"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            aria-label={`Remover ${tag}`}
            className="inline-flex size-5 items-center justify-center rounded-full text-ink-faint hover:bg-surface-muted hover:text-ink"
          >
            <X size={12} strokeWidth={2.1} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        {...aria}
        value={draft}
        onChange={(e) => {
          const next = e.target.value;
          // A separator arriving through input (autofill, IME, mobile keyboards) commits like Enter.
          if (/[,;]/.test(next)) commit(next);
          else setDraft(next);
        }}
        onKeyDown={onKeyDown}
        onPaste={onPaste}
        onBlur={() => draft.trim() && commit(draft)}
        placeholder={value.length ? "Adicionar bairro" : placeholder}
        autoComplete="off"
        enterKeyHint="enter"
        className="h-8 min-w-32 flex-1 bg-transparent px-1.5 text-body text-ink outline-none placeholder:font-normal placeholder:text-ink-faint focus-visible:outline-none"
      />
    </div>
  );
}
