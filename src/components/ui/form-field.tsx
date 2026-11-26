"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Label } from "./label";

interface FormFieldContextValue {
  id: string;
  describedBy?: string;
  hasError: boolean;
  required: boolean;
}

const FormFieldContext = createContext<FormFieldContextValue | null>(null);

/**
 * Wires a control rendered inside <FormField> to its hint/error: returns the aria props the
 * control should spread. Explicit props always win over the field context.
 */
export function useFieldControlProps(props: {
  id?: string;
  invalid?: boolean;
  required?: boolean;
  "aria-describedby"?: string;
}) {
  const field = useContext(FormFieldContext);
  const invalid = props.invalid ?? field?.hasError ?? false;
  const describedBy = [props["aria-describedby"], field?.describedBy].filter(Boolean).join(" ") || undefined;
  return {
    id: props.id ?? field?.id,
    required: props.required ?? (field?.required || undefined),
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    invalid,
  };
}

export interface FormFieldProps {
  label: ReactNode;
  htmlFor: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, hint, error, required = false, className, children }: FormFieldProps) {
  const hintId = `${htmlFor}-hint`;
  const errorId = `${htmlFor}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <FormFieldContext.Provider value={{ id: htmlFor, describedBy, hasError: Boolean(error), required }}>
      <div className={cn("flex flex-col gap-2", className)}>
        <Label htmlFor={htmlFor}>
          {label}
          {required && (
            <span aria-hidden="true" className="text-brand">
              {" *"}
            </span>
          )}
        </Label>
        {children}
        {error ? (
          <p id={errorId} role="alert" className="text-caption font-semibold text-danger">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-caption text-ink-muted">
            {hint}
          </p>
        ) : null}
      </div>
    </FormFieldContext.Provider>
  );
}
