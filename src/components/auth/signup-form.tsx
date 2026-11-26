"use client";

import { IdCard, Mail, MailCheck, UserRound } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { Button, FormField, Icon, Input } from "@/components/ui";
import { formatCpf } from "@/lib/cpf";
import { cpfSchema, fieldErrors, PASSWORD_MIN, signupSchema, type FieldErrors } from "@/lib/schemas/auth";
import { signUpAction } from "@/server/actions/auth";
import { FormAlert } from "./form-alert";
import { PasswordInput } from "./password-input";
import { TextLink } from "./text-link";

export function SignupForm({ next, loginHref, requireCpf = false }: { next?: string; loginHref?: string; requireCpf?: boolean }) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signupSchema.safeParse({ name, email, password });
    const cpfResult = requireCpf ? cpfSchema.safeParse(cpf) : null;
    if (!parsed.success || (cpfResult && !cpfResult.success)) {
      setErrors({
        ...(parsed.success ? {} : fieldErrors(parsed.error)),
        ...(cpfResult && !cpfResult.success ? { cpf: "Informe um CPF válido." } : {}),
      });
      return;
    }
    const form = new FormData(event.currentTarget);
    setErrors({});
    setFormError(undefined);
    startTransition(async () => {
      const result = await signUpAction(form);
      if (!result) return;
      if (result.ok) setSentTo(result.email);
      else {
        setErrors(result.fieldErrors ?? {});
        setFormError(result.error);
      }
    });
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-brand-soft-border bg-brand-soft text-brand">
          <Icon icon={MailCheck} size={24} />
        </span>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-heading text-ink">Confira seu e-mail</h2>
          <p className="text-body-sm font-normal text-ink-muted">
            Enviamos um link de confirmação para <strong className="font-bold text-ink">{sentTo}</strong>. Abra o
            link neste navegador para ativar sua conta e montar seu restaurante.
          </p>
        </div>
        <p className="text-caption text-ink-muted">
          Não recebeu? Verifique a caixa de spam ou{" "}
          <button
            type="button"
            onClick={() => setSentTo(undefined)}
            className="rounded-xs font-bold text-brand transition-colors duration-150 ease-out hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            tente outro e-mail
          </button>
          .
        </p>
        <TextLink href={loginHref ?? (next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar")} className="text-body-sm">
          Voltar para entrar
        </TextLink>
      </div>
    );
  }

  return (
    <form method="post" noValidate onSubmit={onSubmit} className="flex flex-col gap-4.5">
      {next && <input type="hidden" name="next" value={next} />}
      {formError && <FormAlert>{formError}</FormAlert>}
      <FormField label="Seu nome" htmlFor="name" error={errors.name}>
        <Input
          size="lg"
          name="name"
          autoComplete="name"
          placeholder="Marina Souza"
          leftIcon={UserRound}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FormField>
      {requireCpf && (
        <FormField
          label="CPF"
          htmlFor="cpf"
          error={errors.cpf}
          hint="Usado só para emitir seus pagamentos Pix. Fica guardado de forma protegida e você não precisa digitar de novo."
        >
          <Input
            size="lg"
            name="cpf"
            autoComplete="off"
            inputMode="numeric"
            placeholder="000.000.000-00"
            leftIcon={IdCard}
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
          />
        </FormField>
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
      <FormField
        label="Senha"
        htmlFor="password"
        error={errors.password}
        hint={`Mínimo de ${PASSWORD_MIN} caracteres.`}
      >
        <PasswordInput
          name="password"
          autoComplete="new-password"
          placeholder="Crie uma senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
      <Button type="submit" size="xl" block loading={pending}>
        Criar conta grátis
      </Button>
      <p className="text-caption text-ink-muted">
        Ao criar sua conta, você concorda com os <a className="font-bold text-brand underline" href="/termos" target="_blank" rel="noopener">termos de uso</a> e a <a className="font-bold text-brand underline" href="/privacidade" target="_blank" rel="noopener">política de privacidade</a> do Menzu.
      </p>
    </form>
  );
}
