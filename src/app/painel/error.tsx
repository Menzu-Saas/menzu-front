"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { StatusScreen } from "@/components/feedback/status-screen";
import { Button } from "@/components/ui";

/** Keeps the admin shell (sidebar/header) when a panel page fails. */
export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      variant="inline"
      icon={TriangleAlert}
      title="Algo deu errado"
      description="Não conseguimos carregar esta tela. Tente novamente em instantes."
      action={<Button onClick={reset}>Tentar novamente</Button>}
    />
  );
}
