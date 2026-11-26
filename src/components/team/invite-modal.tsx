"use client";

import { Mail, UserPlus } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import {
  Button,
  FormField,
  Icon,
  Input,
  Modal,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { MemberRole } from "@/lib/order-status";
import type { FieldErrors } from "@/lib/schemas/auth";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/team";
import { inviteMemberAction } from "@/server/actions/team";
import { CopyButton } from "./copy-button";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";

/** "Convidar membro": e-mail + papel → invite link `${APP_URL}/convite/{token}` with copy button. */
export function InviteModal({ roles }: { roles: MemberRole[] }) {
  const rid = useRestaurantId();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("ATTENDANT");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const [link, setLink] = useState<string>();
  const [pending, startTransition] = useTransition();

  function reset() {
    setEmail("");
    setRole("ATTENDANT");
    setErrors({});
    setFormError(undefined);
    setLink(undefined);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(undefined);
    startTransition(safely(async () => {
      const result = await inviteMemberAction(rid, { email, role });
      if (result.ok) {
        setLink(result.url);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      setFormError(result.error);
    }));
  }

  return (
    <>
      <Button
        size="md"
        className="font-extrabold"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <Icon icon={UserPlus} size={18} />
        Convidar membro
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={link ? "Convite criado" : "Convidar membro"}
        description={
          link
            ? `Envie este link para ${email.trim().toLowerCase()}. Ele vale por 7 dias e só funciona com esse e-mail.`
            : "A pessoa entra com o e-mail convidado e passa a fazer parte da equipe."
        }
        footer={
          link ? (
            <>
              <Button variant="outline" onClick={reset}>
                Convidar outra pessoa
              </Button>
              <Button variant="inverse" onClick={() => setOpen(false)}>
                Concluir
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancelar
              </Button>
              <Button type="submit" form="invite-form" variant="inverse" loading={pending}>
                Gerar convite
              </Button>
            </>
          )
        }
      >
        {link ? (
          <div className="flex flex-col gap-3">
            <p className="break-all rounded-xl border border-line bg-surface-sunken px-3.5 py-3 font-mono text-body-sm text-ink-secondary">
              {link}
            </p>
            <CopyButton value={link} size="md" className="self-start" />
          </div>
        ) : (
          <form id="invite-form" noValidate onSubmit={submit} className="flex flex-col gap-4.5">
            {formError && (
              <p role="alert" className="rounded-xl bg-danger-soft px-3.5 py-3 text-body-sm text-danger">
                {formError}
              </p>
            )}
            <FormField label="E-mail" htmlFor="invite-email" error={errors.email} required>
              <Input
                type="email"
                autoComplete="off"
                placeholder="nome@exemplo.com"
                leftIcon={Mail}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((x) => ({ ...x, email: "" }));
                }}
              />
            </FormField>
            <FormField label="Papel" htmlFor="invite-role" error={errors.role} hint={ROLE_DESCRIPTION[role]}>
              <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </form>
        )}
      </Modal>
    </>
  );
}
