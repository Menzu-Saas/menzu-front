"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField } from "@/components/ui";
import { fieldErrors, PASSWORD_MIN, resetPasswordSchema, type FieldErrors } from "@/lib/schemas/auth";
import { resetPasswordAction } from "@/server/actions/auth";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm({ next }: { next?: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = resetPasswordSchema.safeParse({ password, confirm });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const form = new FormData(event.currentTarget);
    setErrors({});
    setFormError(undefined);
    startTransition(async () => {
      const result = await resetPasswordAction(form);
      if (result && !result.ok) {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  }

  return (
    <form method="post" noValidate onSubmit={onSubmit} className="flex flex-col gap-4.5">
      {next && <input type="hidden" name="next" value={next} />}
      {formError && <FormAlert>{formError}</FormAlert>}
      <FormField
        label="Nova senha"
        htmlFor="password"
        error={errors.password}
        hint={`Mínimo de ${PASSWORD_MIN} caracteres.`}
      >
        <PasswordInput
          name="password"
          autoComplete="new-password"
          placeholder="Crie uma nova senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
      <FormField label="Confirme a nova senha" htmlFor="confirm" error={errors.confirm}>
        <PasswordInput
          name="confirm"
          autoComplete="new-password"
          placeholder="Repita a senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </FormField>
      <Button type="submit" size="xl" block loading={pending}>
        Salvar nova senha
      </Button>
    </form>
  );
}
