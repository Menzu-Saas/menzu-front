"use client";

import { useRef, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Shown but not selectable (e.g. "em breve"); skipped by arrow-key navigation. */
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  block?: boolean;
  "aria-label"?: string;
  className?: string;
}

/** Track muted r14 p5 gap6; active item white r11 + segment shadow, 700 ink; inactive 600 subtle. */
export const segmentTrack = "gap-1.5 rounded-xl bg-surface-muted p-1.25";
export const segmentItem = cn(
  "rounded-md p-2.5 text-center text-body-sm transition-[background-color,color,box-shadow,transform] duration-150 ease-out",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px",
  "disabled:cursor-not-allowed disabled:opacity-50",
);
export const segmentActive = "bg-surface font-bold text-ink shadow-segment";
export const segmentInactive = "font-semibold text-ink-subtle hover:text-ink";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  block = false,
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    let next = index;
    for (let step = 0; step < options.length; step++) {
      next = (next + delta + options.length) % options.length;
      if (!options[next].disabled) break;
    }
    if (next === index || options[next].disabled) return;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      className={cn(block ? "flex w-full" : "inline-flex", segmentTrack, className)}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={option.disabled}
            onClick={() => !checked && !option.disabled && onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(segmentItem, block && "flex-1", checked ? segmentActive : segmentInactive)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
