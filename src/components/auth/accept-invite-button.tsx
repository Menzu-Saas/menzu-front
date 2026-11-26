"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { acceptInviteAction } from "@/server/actions/auth";
import { FormAlert } from "./form-alert";

export function AcceptInviteButton({ token }: { token: string }) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3.5">
      {error && <FormAlert>{error}</FormAlert>}
      <Button
        size="xl"
        block
        loading={pending}
        onClick={() =>
          startTransition(async () => {
            setError(undefined);
            const result = await acceptInviteAction(token);
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        Aceitar convite e entrar na equipe
      </Button>
    </div>
  );
}
