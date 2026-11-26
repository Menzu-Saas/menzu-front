"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useRestaurantId } from "@/components/admin/current-restaurant";
import { safely } from "@/components/admin/safely";
import { Button, notify } from "@/components/ui";
import { activateAsaasPixAction } from "@/server/actions/asaas-account";

export function ActivatePixButton() {
  const rid = useRestaurantId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function activate() {
    startTransition(safely(async () => {
      const res = await activateAsaasPixAction(rid);
      if (!res.ok) notify.error(res.error);
      else notify.success(res.pixReady ? "Pix ativado" : "Chave Pix em ativação. Confira de novo em alguns minutos.");
      router.refresh();
    }));
  }

  return <Button type="button" loading={pending} onClick={activate}>Ativar Pix</Button>;
}
