"use client";

import { Mail } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField, Input } from "@/components/ui";
import { fieldErrors, loginSchema, type FieldErrors } from "@/lib/schemas/auth";
import { signInAction } from "@/server/actions/auth";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";
import { TextLink } from "./text-link";

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    const form = new FormData(event.currentTarget);
    setErrors({});
    setFormError(undefined);
    startTransition(async () => {
      const result = await signInAction(form);
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
      <FormField label="Senha" htmlFor="password" error={errors.password}>
        <PasswordInput
          name="password"
          autoComplete="current-password"
          placeholder="Sua senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
      <div className="-mt-1 flex justify-end">
        <TextLink href={next ? `/recuperar-senha?next=${encodeURIComponent(next)}` : "/recuperar-senha"} className="text-body-sm">
          Esqueci minha senha
        </TextLink>
      </div>
      <Button type="submit" size="xl" block loading={pending}>
        Entrar
      </Button>
    </form>
  );
}
