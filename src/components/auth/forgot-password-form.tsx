"use client";

import { Mail } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField, Input } from "@/components/ui";
import { fieldErrors, forgotPasswordSchema, type FieldErrors } from "@/lib/schemas/auth";
import { requestPasswordResetAction } from "@/server/actions/auth";
import { FormAlert } from "./form-alert";

export function ForgotPasswordForm({ initialError, next }: { initialError?: string; next?: string }) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const [sentTo, setSentTo] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const form = new FormData(event.currentTarget);
    setErrors({});
    setFormError(undefined);
    startTransition(async () => {
      const result = await requestPasswordResetAction(form);
      if (result.ok) setSentTo(result.email);
      else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  }

  return (
    <form method="post" noValidate onSubmit={onSubmit} className="flex flex-col gap-4.5">
      {next && <input type="hidden" name="next" value={next} />}
      {formError && <FormAlert>{formError}</FormAlert>}
      {sentTo && (
        <FormAlert tone="success">
          Se existir uma conta para <strong className="font-bold">{sentTo}</strong>, você vai receber um link para
          criar uma nova senha em instantes.
        </FormAlert>
      )}
      <FormField label="E-mail" htmlFor="email" error={errors.email}>
        <Input
          size="lg"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="voce@restaurante.com"
          leftIcon={Mail}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <Button type="submit" size="xl" block loading={pending}>
        {sentTo ? "Reenviar link" : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
