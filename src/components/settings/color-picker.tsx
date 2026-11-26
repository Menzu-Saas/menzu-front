"use client";

import { Pipette } from "lucide-react";
import { useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from "react";
import { Icon } from "@/components/ui";
import { cn } from "@/lib/cn";
import { hexToRgb, hslToRgb, hsvToRgb, rgbToHex, rgbToHsl, rgbToHsv, type Hsv, type Rgb } from "@/lib/color";
import { BRAND_SWATCHES } from "@/lib/schemas/settings";

const FORMATS = ["HEX", "RGB", "HSB", "HSL"] as const;
type Format = (typeof FORMATS)[number];

type EyeDropperConstructor = new () => { open: () => Promise<{ sRGBHex: string }> };
const eyeDropper = () => (window as unknown as { EyeDropper?: EyeDropperConstructor }).EyeDropper;

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value));
/** Passo do teclado em saturação e brilho; com Shift anda dez vezes mais. */
const STEP = 0.01;

const fromHex = (hex: string): Hsv => rgbToHsv(hexToRgb(hex) ?? hexToRgb(BRAND_SWATCHES[0].value)!);

export interface ColorPickerProps {
  /** "#RRGGBB"; vazio ou incompleto parte da cor padrão do Menzu, sem alterar o formulário. */
  value: string;
  onChange: (hex: string) => void;
}

/** Seletor de cores: área de saturação e brilho, matiz, conta-gotas e campos HEX, RGB, HSB e HSL. */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const base = hexToRgb(value) ? value.toUpperCase() : BRAND_SWATCHES[0].value;
  // O matiz e a saturação ficam guardados aqui: o HEX os perde no preto, no branco e nos cinzas.
  const [state, setState] = useState(() => ({ hex: base, hsv: fromHex(base) }));
  if (state.hex !== base) setState({ hex: base, hsv: fromHex(base) });
  const hsv = state.hex === base ? state.hsv : fromHex(base);
  const rgb = hexToRgb(base)!;

  const [format, setFormat] = useState<Format>("HEX");
  const canPick = useSyncExternalStore(() => () => {}, () => Boolean(eyeDropper()), () => false);

  const emit = (hex: string, nextHsv: Hsv) => {
    setState({ hex, hsv: nextHsv });
    onChange(hex);
  };
  const setHsv = (next: Hsv) => emit(rgbToHex(hsvToRgb(next)), next);
  const setRgb = (next: Rgb) => {
    const hex = rgbToHex(next);
    emit(hex, fromHex(hex));
  };

  const pickFromScreen = async () => {
    const Dropper = eyeDropper();
    if (!Dropper) return;
    try {
      const { sRGBHex } = await new Dropper().open();
      const picked = hexToRgb(sRGBHex);
      if (picked) setRgb(picked);
    } catch {
      // A pessoa cancelou (Esc): a cor fica como estava.
    }
  };

  const pointAt = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (!box.width || !box.height) return;
    setHsv({ h: hsv.h, s: clamp((event.clientX - box.left) / box.width, 1), v: 1 - clamp((event.clientY - box.top) / box.height, 1) });
  };
  const [dragging, setDragging] = useState(false);

  const nudge = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? STEP * 10 : STEP;
    const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    const delta = move[event.key];
    if (!delta) return;
    event.preventDefault();
    setHsv({ h: hsv.h, s: clamp(hsv.s + delta[0], 1), v: clamp(hsv.v + delta[1], 1) });
  };

  const pureHue = rgbToHex(hsvToRgb({ h: hsv.h, s: 1, v: 1 }));

  return (
    <div role="group" aria-label="Seletor de cores" className="flex w-full max-w-80 flex-col gap-3 rounded-3xl border border-line bg-surface p-3 shadow-lg">
      <div
        role="slider"
        tabIndex={0}
        aria-label="Saturação e brilho"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(hsv.s * 100)}
        aria-valuetext={`Saturação ${Math.round(hsv.s * 100)}%, brilho ${Math.round(hsv.v * 100)}%`}
        className="relative h-44 w-full cursor-crosshair touch-none select-none rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        style={{ backgroundColor: pureHue, backgroundImage: "linear-gradient(to top, black, transparent), linear-gradient(to right, white, transparent)" }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.setPointerCapture?.(event.pointerId);
          event.currentTarget.focus();
          setDragging(true);
          pointAt(event);
        }}
        onPointerMove={(event) => dragging && pointAt(event)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={nudge}
      >
        <span
          aria-hidden="true"
          className="mz-color-handle pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: base }}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={359}
          aria-label="Matiz"
          className="mz-color-hue h-3 min-w-0 flex-1 cursor-pointer appearance-none rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          style={{ color: pureHue }}
          value={Math.round(hsv.h) % 360}
          onChange={(event) => setHsv({ ...hsv, h: Number(event.target.value) })}
        />
        {canPick && (
          <button
            type="button"
            aria-label="Pegar uma cor da tela"
            title="Pegar uma cor da tela"
            onClick={pickFromScreen}
            className="inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-muted text-ink hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Icon icon={Pipette} size={18} />
          </button>
        )}
      </div>

      <Fields format={format} rgb={rgb} hsv={hsv} hex={base} onRgb={setRgb} onHsv={setHsv} />

      <div role="group" aria-label="Formato da cor" className="grid grid-cols-4 gap-1 rounded-xl bg-surface-muted p-1">
        {FORMATS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={format === item}
            onClick={() => setFormat(item)}
            className={cn(
              "h-8 cursor-pointer rounded-lg text-caption font-bold transition-colors duration-150 ease-out",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              format === item ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

interface FieldsProps {
  format: Format;
  hex: string;
  rgb: Rgb;
  hsv: Hsv;
  onRgb: (rgb: Rgb) => void;
  onHsv: (hsv: Hsv) => void;
}

function Fields({ format, hex, rgb, hsv, onRgb, onHsv }: FieldsProps) {
  if (format === "HEX") {
    return (
      <Field
        key="HEX"
        label="Código HEX"
        value={hex}
        sanitize={(raw) => `#${raw.replace(/[^0-9a-fA-F]/g, "").slice(0, 6)}`.toUpperCase()}
        apply={(text) => {
          const parsed = hexToRgb(text);
          if (parsed) onRgb(parsed);
        }}
      />
    );
  }

  // [rótulo, valor mostrado, máximo, o que fazer com o número digitado]
  let channels: [string, number, number, (n: number) => void][];
  if (format === "RGB") {
    channels = (["r", "g", "b"] as const).map((key) => [key.toUpperCase(), rgb[key], 255, (n) => onRgb({ ...rgb, [key]: n })]);
  } else if (format === "HSB") {
    channels = [
      ["H", Math.round(hsv.h), 360, (n) => onHsv({ ...hsv, h: n })],
      ["S", Math.round(hsv.s * 100), 100, (n) => onHsv({ ...hsv, s: n / 100 })],
      ["B", Math.round(hsv.v * 100), 100, (n) => onHsv({ ...hsv, v: n / 100 })],
    ];
  } else {
    // No cinza o HSL não tem matiz próprio: usa o que está guardado.
    const hsl = rgbToHsl(rgb);
    const h = hsl.s === 0 ? hsv.h : hsl.h;
    const applyHsl = (next: { h: number; s: number; l: number }) => onHsv(rgbToHsv(hslToRgb(next)));
    channels = [
      ["H", Math.round(h), 360, (n) => applyHsl({ ...hsl, h: n })],
      ["S", Math.round(hsl.s * 100), 100, (n) => applyHsl({ ...hsl, h, s: n / 100 })],
      ["L", Math.round(hsl.l * 100), 100, (n) => applyHsl({ ...hsl, h, l: n / 100 })],
    ];
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {channels.map(([label, shown, max, set]) => (
        <Field
          key={`${format}-${label}`}
          label={label}
          caption
          numeric
          value={String(shown)}
          sanitize={(raw) => raw.replace(/\D/g, "").slice(0, 3)}
          apply={(text) => text !== "" && set(clamp(Number(text), max))}
        />
      ))}
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  caption?: boolean;
  numeric?: boolean;
  sanitize: (raw: string) => string;
  apply: (text: string) => void;
}

/** Enquanto a pessoa digita, mostra o que ela digitou; ao sair, volta ao valor real da cor. */
function Field({ label, value, caption, numeric, sanitize, apply }: FieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="flex min-w-0 flex-col items-center gap-1">
      <input
        type="text"
        aria-label={label}
        inputMode={numeric ? "numeric" : "text"}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        className="h-10 w-full min-w-0 rounded-xl border border-line bg-surface-muted px-2 text-center font-mono text-body-sm tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        value={draft ?? value}
        onFocus={(event) => event.target.select()}
        onChange={(event) => {
          const text = sanitize(event.target.value);
          setDraft(text);
          apply(text);
        }}
        onBlur={() => setDraft(null)}
      />
      {caption && <span aria-hidden="true" className="text-caption text-ink-muted">{label}</span>}
    </label>
  );
}
