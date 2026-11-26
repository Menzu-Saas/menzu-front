"use client";

import { CalendarRange } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  Button,
  FormField,
  Icon,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SegmentedControl,
} from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatDayBr, REPORT_PRESET_LABEL, REPORT_PRESETS, type ReportPreset } from "@/lib/reports";

const OPTIONS = REPORT_PRESETS.map((value) => ({ value, label: REPORT_PRESET_LABEL[value] }));

export interface ReportRangeControlProps {
  preset: ReportPreset | "custom";
  fromDay: string;
  toDay: string;
  /** Today in the restaurant timezone ("YYYY-MM-DD"), the latest selectable day. */
  today: string;
}

/** Presets (Hoje / 7 dias / 30 dias / Este mês) + "Personalizado" day range, kept in the URL. */
export function ReportRangeControl({ preset, fromDay, toDay, today }: ReportRangeControlProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(fromDay);
  const [to, setTo] = useState(toDay);
  const [error, setError] = useState<string>();

  function go(query: string) {
    startTransition(() => router.replace(`${pathname}?${query}`, { scroll: false }));
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!from || !to) return setError("Escolha as duas datas.");
    if (from > to) return setError("A data inicial deve ser antes da final.");
    if (to > today) return setError("A data final não pode ser no futuro.");
    setError(undefined);
    setOpen(false);
    go(`de=${from}&ate=${to}`);
  }

  const custom = preset === "custom";

  return (
    <div className="contents">
      <SegmentedControl
        aria-label="Período"
        options={OPTIONS}
        // A custom range highlights nothing: the "Personalizado" button shows it instead.
        value={custom ? ("" as ReportPreset) : preset}
        onChange={(next) => go(`periodo=${next}`)}
        className={cn(pending && "opacity-80")}
      />
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setFrom(fromDay);
            setTo(toDay);
            setError(undefined);
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button variant={custom ? "inverse" : "outline"} size="md">
            <Icon icon={CalendarRange} size={18} />
            {custom ? `${formatDayBr(fromDay)} – ${formatDayBr(toDay)}` : "Personalizado"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <form noValidate onSubmit={apply} className="flex flex-col gap-3.5">
            <p className="text-body font-extrabold text-ink">Período personalizado</p>
            <div className="grid grid-cols-2 gap-2.5">
              <FormField label="De" htmlFor="report-from">
                <Input type="date" max={today} value={from} onChange={(e) => setFrom(e.target.value)} />
              </FormField>
              <FormField label="Até" htmlFor="report-to">
                <Input type="date" max={today} value={to} onChange={(e) => setTo(e.target.value)} />
              </FormField>
            </div>
            {error && (
              <p role="alert" className="text-caption font-semibold text-danger">
                {error}
              </p>
            )}
            <Button type="submit" variant="inverse" block>
              Aplicar
            </Button>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
