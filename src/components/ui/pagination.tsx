"use client";

import { Button } from "./button";

export function Pagination({ page, pageSize, total, onChange, label = "Paginação" }: {
  page: number; pageSize: number; total: number; onChange: (page: number) => void; label?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pages);
  if (pages <= 1) return null;
  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
    <p role="status" className="text-caption text-ink-muted">{(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)} de {total} · Página {current} de {pages}</p>
    <div className="flex gap-2"><Button variant="outline" aria-label={`Anterior: ${label}`} disabled={current === 1} onClick={() => onChange(current - 1)}>Anterior</Button><Button variant="outline" aria-label={`Próxima: ${label}`} disabled={current === pages} onClick={() => onChange(current + 1)}>Próxima</Button></div>
  </nav>;
}
