"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Button, notify } from "@/components/ui";
import { cn } from "@/lib/cn";
import { onlyDigits } from "@/lib/phone";
import type { FieldErrors } from "@/lib/schemas/auth";
import { safely } from "@/components/admin/safely";

/** Progressive BR phone mask: (11) 98765-4321 / (11) 3456-7890. */
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function maskCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export interface SettingsSectionProps {
  id: string;
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Section card (reference P5): white r20 panel, 26px padding, 13/800 faint uppercase heading. */
export function SettingsSection({ id, title, description, aside, children, className }: SettingsSectionProps) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className={cn("flex min-w-0 flex-col gap-5 rounded-4xl border border-line bg-surface p-5 sm:p-6.5", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={`${id}-title`} className="text-body-sm font-extrabold tracking-wider uppercase text-ink-faint">
            {title}
          </h2>
          {description && <p className="text-caption text-ink-muted">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Dark "Salvar alterações" h50 (reference P5). Full width on phones. */
export function SaveButton({ pending, dirty = true, label = "Salvar alterações" }: { pending: boolean; dirty?: boolean; label?: string }) {
  return (
    <Button type="submit" variant="inverse" size="lg" loading={pending} disabled={!dirty} className="w-full sm:w-auto sm:min-w-56 sm:self-end">
      {label}
    </Button>
  );
}

type Result = { ok: true } | { ok: false; error?: string; fieldErrors?: FieldErrors };

/** Save flow shared by the sections: pending state, field errors, toast and a router refresh. */
export function useSave() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<FieldErrors>({});

  function save(run: () => Promise<Result>, success = "Alterações salvas.", onSaved?: () => void) {
    startTransition(safely(async () => {
      const result = await run();
      if (result.ok) {
        setErrors({});
        notify.success(success);
        onSaved?.();
        router.refresh();
        return;
      }
      setErrors(result.fieldErrors ?? {});
      notify.error(result.error ?? "Revise os campos destacados.");
    }));
  }

  function clear(...keys: string[]) {
    setErrors((e) => {
      if (!keys.some((k) => e[k])) return e;
      const next = { ...e };
      keys.forEach((k) => delete next[k]);
      return next;
    });
  }

  return { pending, errors, setErrors, save, clear };
}

/** Switch row exactly like P5: 13/600 label left, 40×22 switch right. */
export function SwitchRow({
  id,
  label,
  hint,
  control,
}: {
  id: string;
  label: string;
  hint?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="flex min-w-0 flex-col">
        <span className="text-body-sm font-semibold text-ink">{label}</span>
        {hint && <span className="text-caption text-ink-muted">{hint}</span>}
      </label>
      {control}
    </div>
  );
}
