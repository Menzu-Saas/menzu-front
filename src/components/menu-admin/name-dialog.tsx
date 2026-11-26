"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField, Input, Modal, Textarea } from "@/components/ui";
import type { FieldErrors } from "@/lib/schemas/auth";
import { safely } from "@/components/admin/safely";

export interface NameDialogValues {
  name: string;
  description?: string;
}

export interface NameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  label: string;
  placeholder?: string;
  submitLabel: string;
  initial?: NameDialogValues;
  /** Shows an optional description textarea (categories). */
  withDescription?: boolean;
  /** Returns field errors / a form error, or nothing on success (the dialog then closes). */
  onSubmit: (values: NameDialogValues) => Promise<{ fieldErrors?: FieldErrors; error?: string } | void>;
}

/** Small create/rename dialog used for menus and categories. Form state resets each time it opens. */
export function NameDialog({ open, onOpenChange, title, ...form }: NameDialogProps) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={title} size="sm">
      <NameDialogForm {...form} onClose={() => onOpenChange(false)} />
    </Modal>
  );
}

function NameDialogForm({
  label,
  placeholder,
  submitLabel,
  initial,
  withDescription = false,
  onSubmit,
  onClose,
}: Omit<NameDialogProps, "open" | "onOpenChange" | "title"> & { onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(safely(async () => {
      const res = await onSubmit({ name, description: withDescription ? description : undefined });
      if (res && (res.fieldErrors || res.error)) {
        setErrors({ ...(res.fieldErrors ?? {}), ...(res.error ? { _form: res.error } : {}) });
        return;
      }
      onClose();
    }));
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormField label={label} htmlFor="mz-name-dialog-name" error={errors.name} required>
        <Input autoFocus value={name} maxLength={80} placeholder={placeholder} onChange={(e) => setName(e.target.value)} />
      </FormField>
      {withDescription && (
        <FormField
          label="Descrição"
          htmlFor="mz-name-dialog-description"
          hint="Opcional. Aparece abaixo do nome no cardápio."
          error={errors.description}
        >
          <Textarea value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} />
        </FormField>
      )}
      {errors._form && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {errors._form}
        </p>
      )}
      <div className="mt-2 flex flex-wrap items-center justify-end gap-2.5">
        <Button variant="outline" disabled={pending} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
