"use client";

import { hexToRgb, rgbToHex, type Rgb } from "@/lib/color";
import { BRAND_SWATCHES } from "@/lib/schemas/settings";

const CHANNELS: { key: keyof Rgb; letter: string; name: string; label: string }[] = [
  { key: "r", letter: "R", name: "vermelho", label: "Vermelho (R)" },
  { key: "g", letter: "G", name: "verde", label: "Verde (G)" },
  { key: "b", letter: "B", name: "azul", label: "Azul (B)" },
];

export interface RgbPickerProps {
  /** "#RRGGBB"; vazio ou incompleto parte da cor padrão do Menzu, sem alterar o formulário. */
  value: string;
  onChange: (hex: string) => void;
}

/** Qualquer cor: espectro completo (seletor do aparelho) ou ajuste fino em R, G e B. */
export function RgbPicker({ value, onChange }: RgbPickerProps) {
  const rgb = hexToRgb(value) ?? hexToRgb(BRAND_SWATCHES[0].value)!;
  const hex = rgbToHex(rgb);
  const setChannel = (key: keyof Rgb, raw: string) => {
    if (raw.trim() === "" || Number.isNaN(Number(raw))) return;
    onChange(rgbToHex({ ...rgb, [key]: Number(raw) }));
  };

  return (
    <div role="group" aria-label="Seletor RGB" className="flex w-full max-w-md flex-col gap-3 rounded-2xl border border-line bg-surface-muted p-3.5">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="color"
          aria-label="Abrir o seletor de cores"
          className="h-11 w-16 shrink-0 cursor-pointer rounded-md border border-line bg-surface p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          value={hex.toLowerCase()}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
        <span className="text-caption text-ink-muted">
          <span className="block font-bold text-ink">Escolher qualquer cor</span>
          <span className="font-mono tabular-nums">rgb({rgb.r}, {rgb.g}, {rgb.b})</span>
        </span>
      </label>
      {CHANNELS.map((channel) => {
        // A faixa mostra o resultado de mover só este canal.
        const from = rgbToHex({ ...rgb, [channel.key]: 0 });
        const to = rgbToHex({ ...rgb, [channel.key]: 255 });
        return (
          <div key={channel.key} className="flex items-center gap-2.5">
            <span aria-hidden="true" className="w-3 shrink-0 text-caption font-bold text-ink">{channel.letter}</span>
            <input
              type="range"
              min={0}
              max={255}
              aria-label={channel.label}
              className="mz-rgb-range h-3 min-w-0 flex-1 cursor-pointer appearance-none rounded-full border border-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              style={{ backgroundImage: `linear-gradient(to right, ${from}, ${to})` }}
              value={rgb[channel.key]}
              onChange={(e) => setChannel(channel.key, e.target.value)}
            />
            <input
              type="number"
              min={0}
              max={255}
              inputMode="numeric"
              aria-label={`Valor de ${channel.name}`}
              className="h-9 w-18 shrink-0 rounded-md border border-line bg-surface px-2 text-right text-body-sm tabular-nums text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              value={rgb[channel.key]}
              onChange={(e) => setChannel(channel.key, e.target.value)}
            />
          </div>
        );
      })}
    </div>
  );
}
