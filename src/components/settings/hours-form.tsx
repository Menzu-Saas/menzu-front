"use client";

import { CircleAlert, CopyCheck, Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, Icon, IconButton, Input, Switch } from "@/components/ui";
import { cn } from "@/lib/cn";
import { WEEKDAYS } from "@/lib/schemas/restaurant";
import { MAX_INTERVALS_PER_DAY, type HourInterval } from "@/lib/schemas/settings";
import { updateHoursAction } from "@/server/actions/settings";
import type { HourRow } from "@/server/queries/settings";
import { SaveButton, SettingsSection, useSave } from "./shared";
import { useRestaurantId } from "@/components/admin/current-restaurant";

interface Interval {
  key: number;
  /** "HH:MM" or the stored "HH:MM:SS" (kept verbatim until edited, e.g. 23:59:59). */
  opens_at: string;
  closes_at: string;
}

interface Day {
  weekday: number;
  open: boolean;
  intervals: Interval[];
}

/** Monday → Sunday, as people in Brazil read a week. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];
let nextKey = 1;
const key = () => nextKey++;
const hhmm = (t: string) => t.slice(0, 5);
/** "18:00:00" → "18:00"; "23:59:59" stays as is so an untouched schedule saves unchanged. */
const trimSeconds = (t: string) => (t.length >= 8 && t.slice(5, 8) !== ":00" ? t.slice(0, 8) : hhmm(t));

function toDays(rows: HourRow[]): Day[] {
  return ORDER.map((weekday) => {
    const intervals = rows
      .filter((r) => r.weekday === weekday)
      .map((r) => ({ key: key(), opens_at: trimSeconds(r.opens_at), closes_at: trimSeconds(r.closes_at) }));
    return { weekday, open: intervals.length > 0, intervals };
  });
}

function flatten(days: Day[]): { list: HourInterval[]; refs: { weekday: number; key: number }[] } {
  const list: HourInterval[] = [];
  const refs: { weekday: number; key: number }[] = [];
  for (const d of days) {
    if (!d.open) continue;
    for (const i of d.intervals) {
      list.push({ weekday: d.weekday, opens_at: i.opens_at, closes_at: i.closes_at });
      refs.push({ weekday: d.weekday, key: i.key });
    }
  }
  return { list, refs };
}

const signature = (days: Day[]) => JSON.stringify(flatten(days).list);

export function HoursForm({ hours }: { hours: HourRow[] }) {
  const rid = useRestaurantId();
  const [initial] = useState(() => toDays(hours));
  const [days, setDays] = useState<Day[]>(initial);
  const [savedSig, setSavedSig] = useState(() => signature(initial));
  const { pending, errors, setErrors, save } = useSave();
  const dirty = signature(days) !== savedSig;
  const { refs, list } = flatten(days);
  const noHours = list.length === 0;

  /** Errors keyed by interval key (from "hours.<index>.<field>"). */
  const intervalErrors = new Map<number, string>();
  for (const [k, message] of Object.entries(errors)) {
    const m = k.match(/^hours\.(\d+)\./);
    if (m && refs[Number(m[1])]) intervalErrors.set(refs[Number(m[1])].key, message);
  }

  function update(weekday: number, fn: (d: Day) => Day) {
    setDays((list) => list.map((d) => (d.weekday === weekday ? fn(d) : d)));
    setErrors({});
  }

  function copyToAll(source: Day) {
    setDays((list) =>
      list.map((d) =>
        d.weekday === source.weekday
          ? d
          : { ...d, open: source.open, intervals: source.intervals.map((i) => ({ ...i, key: key() })) },
      ),
    );
    setErrors({});
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sig = signature(days);
    const success = noHours ? "Horários salvos. Sem horários, a loja não recebe pedidos." : "Horários salvos.";
    save(() => updateHoursAction(rid, { hours: list }), success, () => setSavedSig(sig));
  }

  return (
    <SettingsSection
      id="horarios"
      title="Horários de funcionamento"
      description="Fora desses horários o cardápio não aceita pedidos. Fecha depois da meia-noite? Ex.: 18:00 às 02:00."
      className="xl:col-span-2"
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <ul className="flex flex-col">
          {days.map((d) => {
            const day = WEEKDAYS[d.weekday].label;
            return (
              <li key={d.weekday} className="flex flex-col gap-3 border-t border-line py-3.5 first:border-t-0 first:pt-0 md:flex-row md:items-start">
                <div className="flex items-center justify-between gap-3 md:w-52 md:shrink-0 md:pt-2.5">
                  <label htmlFor={`day-${d.weekday}`} className="text-body-sm font-semibold text-ink">
                    {day}
                  </label>
                  <div className="flex items-center gap-2.5">
                    <span className={cn("text-caption font-semibold", d.open ? "text-success" : "text-ink-faint")}>
                      {d.open ? "Aberto" : "Fechado"}
                    </span>
                    <Switch
                      id={`day-${d.weekday}`}
                      checked={d.open}
                      onCheckedChange={(open) =>
                        update(d.weekday, (x) => ({
                          ...x,
                          open,
                          intervals: open && x.intervals.length === 0 ? [{ key: key(), opens_at: "11:00", closes_at: "23:00" }] : x.intervals,
                        }))
                      }
                    />
                  </div>
                </div>
                {d.open ? (
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    {d.intervals.map((i, idx) => {
                      const error = intervalErrors.get(i.key);
                      return (
                        <div key={i.key} className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <Input
                              type="time"
                              aria-label={`${day}: abre (${idx + 1}º horário)`}
                              wrapperClassName="w-30 min-w-0 flex-1 sm:flex-none"
                              value={hhmm(i.opens_at)}
                              invalid={Boolean(error) || undefined}
                              onChange={(e) =>
                                update(d.weekday, (x) => ({
                                  ...x,
                                  intervals: x.intervals.map((y) => (y.key === i.key ? { ...y, opens_at: e.target.value } : y)),
                                }))
                              }
                            />
                            <span className="text-body-sm text-ink-muted">às</span>
                            <Input
                              type="time"
                              aria-label={`${day}: fecha (${idx + 1}º horário)`}
                              wrapperClassName="w-30 min-w-0 flex-1 sm:flex-none"
                              value={hhmm(i.closes_at)}
                              invalid={Boolean(error) || undefined}
                              onChange={(e) =>
                                update(d.weekday, (x) => ({
                                  ...x,
                                  intervals: x.intervals.map((y) => (y.key === i.key ? { ...y, closes_at: e.target.value } : y)),
                                }))
                              }
                            />
                            <IconButton
                              label={`Remover ${idx + 1}º horário de ${day.toLowerCase()}`}
                              icon={X}
                              size={34}
                              variant="outline"
                              onClick={() =>
                                update(d.weekday, (x) => {
                                  const intervals = x.intervals.filter((y) => y.key !== i.key);
                                  return { ...x, intervals, open: intervals.length > 0 };
                                })
                              }
                            />
                          </div>
                          {error && (
                            <p role="alert" className="text-caption font-semibold text-danger">
                              {error}
                            </p>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2 text-brand"
                        disabled={d.intervals.length >= MAX_INTERVALS_PER_DAY}
                        onClick={() =>
                          update(d.weekday, (x) => ({ ...x, intervals: [...x.intervals, { key: key(), opens_at: "18:00", closes_at: "23:00" }] }))
                        }
                      >
                        <Icon icon={Plus} size={16} />
                        Adicionar horário
                      </Button>
                      <Button variant="ghost" size="sm" className="px-2 text-ink-secondary" onClick={() => copyToAll(d)}>
                        <Icon icon={CopyCheck} size={16} />
                        Copiar para todos
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="flex-1 text-body-sm text-ink-faint md:pt-2.5">Fechado o dia todo</p>
                )}
              </li>
            );
          })}
        </ul>
        {errors.hours && (
          <p role="alert" className="text-caption font-semibold text-danger">
            {errors.hours}
          </p>
        )}
        {noHours && (
          <div role="status" className="flex items-start gap-3 rounded-2xl bg-warning-soft px-3.5 py-3 text-warning">
            <Icon icon={CircleAlert} size={18} className="mt-0.5 shrink-0" />
            <p className="text-body-sm font-semibold">
              Sem horários — a loja não recebe pedidos. Ative pelo menos um dia para voltar a vender.
            </p>
          </div>
        )}
        <SaveButton pending={pending} dirty={dirty} label={noHours && dirty ? "Salvar sem horários" : undefined} />
      </form>
    </SettingsSection>
  );
}
