"use client";

import { CircleAlert, CircleCheck, Info, LoaderCircle } from "lucide-react";
import { toast, Toaster as Sonner, type ExternalToast } from "sonner";
import { Icon } from "./icon";

/**
 * App toaster (sonner, unstyled): white surface, 1px line, radius 16, frame shadow;
 * success icon in success green, error in danger. Mounted once in the root layout.
 */
export function Toaster() {
  return (
    <Sonner
      position="top-center"
      gap={10}
      offset={16}
      mobileOffset={16}
      icons={{
        success: <Icon icon={CircleCheck} size={20} className="text-success" />,
        error: <Icon icon={CircleAlert} size={20} className="text-danger" />,
        info: <Icon icon={Info} size={20} className="text-brand" />,
        warning: <Icon icon={CircleAlert} size={20} className="text-warning" />,
        loading: <Icon icon={LoaderCircle} size={20} className="animate-spin text-ink-subtle" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5 font-sans text-ink shadow-frame",
          icon: "mt-px flex shrink-0 items-center",
          content: "flex min-w-0 flex-1 flex-col gap-0.5",
          title: "text-body text-ink",
          description: "text-caption text-ink-muted",
          actionButton:
            "ml-auto shrink-0 rounded-md bg-inverse px-3 py-2 text-caption font-bold text-white hover:bg-inverse-hover",
          cancelButton: "ml-auto shrink-0 rounded-md px-3 py-2 text-caption font-bold text-ink-muted hover:bg-surface-muted",
        },
      }}
    />
  );
}

type Message = Parameters<typeof toast.success>[0];

/** Toast helpers — pt-BR copy is passed by the caller, e.g. `notify.success("Produto salvo")`. */
export const notify = {
  success: (message: Message, options?: ExternalToast) => toast.success(message, options),
  error: (message: Message, options?: ExternalToast) => toast.error(message, options),
  info: (message: Message, options?: ExternalToast) => toast.info(message, options),
  dismiss: (id?: string | number) => toast.dismiss(id),
};
