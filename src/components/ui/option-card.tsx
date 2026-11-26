"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { CheckboxMark } from "./checkbox";
import { RadioMark } from "./radio-group";

interface OptionGroupContextValue {
  value: string | null;
  /** The option that receives Tab focus (selected one when enabled, else the first enabled one). */
  tabStop: string | null;
  select: (value: string) => void;
}

const OptionGroupContext = createContext<OptionGroupContextValue | null>(null);

const ITEM_SELECTOR = "[data-option-value]:not(:disabled)";

export interface OptionGroupProps extends Omit<ComponentProps<"div">, "role" | "onChange"> {
  value: string | null;
  onValueChange: (value: string) => void;
  "aria-label": string;
}

/**
 * Radio group of OptionCards (checkout payment/type, single-choice add-ons): role="radiogroup",
 * roving tabindex and arrow keys (Up/Left previous, Down/Right next, Home/End, wrapping, disabled skipped).
 * Children are `<OptionCard value="…" control="radio">`.
 */
export function OptionGroup({ value, onValueChange, className, children, ...props }: OptionGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [firstEnabled, setFirstEnabled] = useState<string | null>(null);
  const [selectedEnabled, setSelectedEnabled] = useState(true);

  // Re-evaluated whenever the options or the value change, e.g. an option becoming disabled.
  useLayoutEffect(() => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    setFirstEnabled(items[0]?.dataset.optionValue ?? null);
    setSelectedEnabled(value != null && items.some((el) => el.dataset.optionValue === value));
  }, [children, value]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const delta =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    const home = event.key === "Home";
    const end = event.key === "End";
    if (!delta && !home && !end) return;
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
    if (!items.length) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = home
      ? 0
      : end
        ? items.length - 1
        : current === -1
          ? 0
          : (current + delta + items.length) % items.length;
    const next = items[nextIndex];
    next.focus();
    const nextValue = next.dataset.optionValue;
    if (nextValue != null && nextValue !== value) onValueChange(nextValue);
  }

  return (
    <OptionGroupContext.Provider value={{ value, tabStop: value != null && selectedEnabled ? value : firstEnabled, select: onValueChange }}>
      <div ref={ref} role="radiogroup" onKeyDown={onKeyDown} className={cn("flex flex-col gap-2.5", className)} {...props}>
        {children}
      </div>
    </OptionGroupContext.Provider>
  );
}

export interface OptionCardProps extends Omit<ComponentProps<"button">, "onSelect" | "role" | "value"> {
  /** Standalone mode: whether the row is selected. Inside an OptionGroup this is derived from `value`. */
  selected?: boolean;
  onSelect?: () => void;
  /** Value inside an OptionGroup. */
  value?: string;
  control?: "checkbox" | "radio" | "none";
  /** Right-aligned content, e.g. "+ R$ 6,00". */
  trailing?: ReactNode;
}

/**
 * Selectable row (product add-ons, checkout payment/type): padding 12x14, radius 14, 1px line;
 * selected = 1.5px accent border + brand-tint background (design-system §5, §10).
 */
export function OptionCard({
  selected: selectedProp = false,
  onSelect,
  value,
  control: controlProp,
  trailing,
  children,
  className,
  onClick,
  disabled,
  type = "button",
  ...props
}: OptionCardProps) {
  const group = useContext(OptionGroupContext);
  const inGroup = group != null && value != null;
  const control = controlProp ?? (inGroup ? "radio" : "checkbox");
  const selected = inGroup ? group.value === value : selectedProp;

  const a11y =
    control === "none"
      ? { "aria-pressed": selected }
      : { role: control, "aria-checked": selected };

  return (
    <button
      type={type}
      {...a11y}
      {...(inGroup ? { "data-option-value": value, tabIndex: group.tabStop === value ? 0 : -1 } : {})}
      data-selected={selected ? "true" : undefined}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (inGroup) {
          if (!selected) group.select(value);
        } else onSelect?.();
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-body text-ink",
        "transition-[background-color,border-color] duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "not-disabled:active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-selected-accent bg-brand-tint"
          : "border border-line bg-surface not-disabled:hover:border-line-strong",
        className,
      )}
      {...props}
    >
      {control === "checkbox" && <CheckboxMark checked={selected} />}
      {control === "radio" && <RadioMark checked={selected} />}
      <span className="min-w-0 flex-1">{children}</span>
      {trailing != null && <span className="shrink-0 text-body-sm font-bold text-ink-secondary">{trailing}</span>}
    </button>
  );
}
